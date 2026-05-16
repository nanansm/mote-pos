import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, syncEvents, cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
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
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.workspaceId, ctx.workspaceId)))
    .limit(1)
  const trx = rows[0]
  if (!trx) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (trx.pickupStatus !== 'pickup_pending') {
    return NextResponse.json({ error: 'tidak dalam status pending' }, { status: 400 })
  }

  let pickupBy: string | null = ctx.cashierId ?? parsed.data.cashierId ?? null
  if (pickupBy) {
    const c = await db
      .select({ id: cashiers.id })
      .from(cashiers)
      .where(and(eq(cashiers.id, pickupBy), eq(cashiers.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (!c[0]) pickupBy = null
  }

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({
        pickupStatus: 'pickup_completed',
        pickupAt: new Date(),
        pickupByCashierId: pickupBy,
        pickupNotes: parsed.data.notes ?? trx.pickupNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: 'transaction',
      referenceId: id,
      payload: { kind: 'pickup_completed', transactionId: id },
      status: 'pending',
    })
  })

  return NextResponse.json({ ok: true })
}
