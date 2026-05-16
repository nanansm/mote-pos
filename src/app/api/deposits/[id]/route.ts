import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customerDeposits, customers, depositUsages, syncEvents } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { verifyManagerPin } from '@/lib/manager-pin'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const rows = await db
    .select({
      deposit: customerDeposits,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(customerDeposits)
    .innerJoin(customers, eq(customers.id, customerDeposits.customerId))
    .where(and(eq(customerDeposits.id, id), eq(customerDeposits.workspaceId, ctx.workspaceId)))
    .limit(1)
  const r = rows[0]
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const usages = await db
    .select()
    .from(depositUsages)
    .where(eq(depositUsages.depositId, id))
    .orderBy(desc(depositUsages.createdAt))

  return NextResponse.json({
    deposit: {
      ...r.deposit,
      amount: Number(r.deposit.amount),
      balance: Number(r.deposit.balance),
      customerName: r.customerName,
      customerPhone: r.customerPhone,
    },
    usages: usages.map((u) => ({
      ...u,
      amount: Number(u.amount),
      balanceAfter: Number(u.balanceAfter),
    })),
  })
}

const RefundBody = z.object({
  pin: z.string().regex(/^\d{6}$/),
  notes: z.string().max(500).nullable().optional(),
})

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  const parsed = RefundBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const check = await verifyManagerPin(ctx.workspaceId, parsed.data.pin)
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 401 })

  const rows = await db
    .select()
    .from(customerDeposits)
    .where(and(eq(customerDeposits.id, id), eq(customerDeposits.workspaceId, ctx.workspaceId)))
    .limit(1)
  const dep = rows[0]
  if (!dep) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (dep.status !== 'active' || Number(dep.balance) <= 0) {
    return NextResponse.json({ error: 'Tidak ada sisa untuk di-refund' }, { status: 400 })
  }

  const refundAmount = Number(dep.balance)
  await db.transaction(async (tx) => {
    await tx
      .update(customerDeposits)
      .set({ balance: 0, status: 'refunded', updatedAt: new Date() })
      .where(eq(customerDeposits.id, id))
    await tx.insert(depositUsages).values({
      id: newId(),
      depositId: id,
      transactionId: null,
      amount: refundAmount,
      balanceAfter: 0,
      usedByCashierId: ctx.cashierId ?? null,
      notes: parsed.data.notes ?? 'Refund sisa deposit',
    })
    await tx
      .update(customers)
      .set({
        totalDepositBalance: sql`GREATEST(0, ${customers.totalDepositBalance} - ${refundAmount})`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, dep.customerId))
    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: 'transaction',
      referenceId: id,
      payload: { kind: 'deposit_refunded', amount: refundAmount },
      status: 'pending',
    })
  })

  return NextResponse.json({ ok: true, refunded: refundAmount })
}
