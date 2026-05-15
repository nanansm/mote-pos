import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  customerDebts,
  customers,
  debtPayments,
  shiftSessions,
  syncEvents,
  auditLogs,
} from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'

const Body = z.object({
  amount: z.number().int().min(1),
  method: z.enum(['cash', 'qris', 'transfer']),
  notes: z.string().max(500).nullable().optional(),
  cashierId: z.string().nullable().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const rows = await db
    .select()
    .from(customerDebts)
    .where(
      and(eq(customerDebts.id, id), eq(customerDebts.workspaceId, ctx.workspaceId)),
    )
    .limit(1)
  const debt = rows[0]
  if (!debt) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const remaining = debt.amount - debt.paidAmount
  if (parsed.data.amount > remaining) {
    return NextResponse.json(
      { error: 'jumlah bayar melebihi sisa hutang' },
      { status: 400 },
    )
  }

  const openShift = await db
    .select({ id: shiftSessions.id })
    .from(shiftSessions)
    .where(
      and(
        eq(shiftSessions.workspaceId, ctx.workspaceId),
        eq(shiftSessions.status, 'open'),
      ),
    )
    .limit(1)
  const shiftId = openShift[0]?.id ?? null

  const payId = newId()
  const newPaid = debt.paidAmount + parsed.data.amount
  const newStatus =
    newPaid >= debt.amount ? 'paid' : newPaid > 0 ? 'partial' : debt.status

  await db.transaction(async (tx) => {
    await tx.insert(debtPayments).values({
      id: payId,
      debtId: id,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.method,
      paidByCashierId: parsed.data.cashierId ?? null,
      shiftId,
      notes: parsed.data.notes ?? null,
    })

    await tx
      .update(customerDebts)
      .set({
        paidAmount: newPaid,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(customerDebts.id, id))

    await tx
      .update(customers)
      .set({
        totalDebt: sql`GREATEST(0, ${customers.totalDebt} - ${parsed.data.amount})`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, debt.customerId))

    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: 'debt_paid',
      referenceId: payId,
      payload: {
        debtId: id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        customerId: debt.customerId,
      },
      status: 'pending',
    })

    await tx.insert(auditLogs).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      shiftId,
      cashierId: parsed.data.cashierId ?? null,
      action: 'debt_pay',
      entityType: 'debt',
      entityId: id,
      newValue: {
        amount: parsed.data.amount,
        method: parsed.data.method,
        newStatus,
      },
      metadata: { customerId: debt.customerId, paidAmount: newPaid, total: debt.amount },
    })
  })

  return NextResponse.json({ ok: true, status: newStatus, paidAmount: newPaid })
}
