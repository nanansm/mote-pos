import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, syncEvents, auditLogs, shiftSessions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { verifyManagerPin } from '@/lib/manager-pin'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'

const Body = z.object({
  pin: z.string().min(6).max(6),
  reason: z.string().min(2).max(500),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const trxRows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.workspaceId, ctx.workspaceId)))
    .limit(1)
  const trx = trxRows[0]
  if (!trx) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (trx.status !== 'completed') {
    return NextResponse.json(
      { error: 'hanya transaksi completed yang bisa di-void' },
      { status: 400 },
    )
  }

  const check = await verifyManagerPin(ctx.workspaceId, parsed.data.pin)
  if (!check.ok) {
    await db.insert(auditLogs).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      action: 'pin_failed',
      entityType: 'transaction',
      entityId: id,
      metadata: { attempted: 'void' },
    })
    return NextResponse.json({ error: check.reason }, { status: 403 })
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

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({
        status: 'voided',
        voidedBy: check.cashierId,
        voidedAt: new Date(),
        voidReason: parsed.data.reason,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))

    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: 'void',
      referenceId: id,
      payload: {
        transactionId: id,
        reason: parsed.data.reason,
        managerId: check.cashierId,
      },
      status: 'pending',
    })

    await tx.insert(auditLogs).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      shiftId,
      cashierId: check.cashierId,
      action: 'void',
      entityType: 'transaction',
      entityId: id,
      oldValue: { status: trx.status, total: trx.total },
      newValue: { status: 'voided' },
      metadata: {
        reason: parsed.data.reason,
        managerName: check.cashierName,
      },
    })
  })

  return NextResponse.json({ ok: true })
}
