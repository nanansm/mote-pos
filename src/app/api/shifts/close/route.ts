import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { shiftSessions, transactions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

const Body = z.object({
  shiftId: z.string().min(1),
  closingBalance: z.number().min(0),
  notes: z.string().max(2000).optional(),
})

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const shift = await db
    .select()
    .from(shiftSessions)
    .where(
      and(
        eq(shiftSessions.id, parsed.data.shiftId),
        eq(shiftSessions.workspaceId, ctx.workspaceId),
        eq(shiftSessions.status, 'open'),
      ),
    )
    .limit(1)
  if (!shift[0]) return NextResponse.json({ error: 'shift not found / already closed' }, { status: 404 })

  const cashSum = await db
    .select({
      sum: sql<string>`COALESCE(SUM(${transactions.total}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.shiftId, shift[0].id),
        eq(transactions.status, 'completed'),
        eq(transactions.paymentMethod, 'cash'),
      ),
    )
  const cashTotal = Number(cashSum[0]?.sum ?? 0)
  const opening = Number(shift[0].openingBalance ?? 0)
  const expected = opening + cashTotal
  const difference = parsed.data.closingBalance - expected

  await db
    .update(shiftSessions)
    .set({
      closedAt: new Date(),
      closingBalance: String(parsed.data.closingBalance),
      expectedBalance: String(expected),
      difference: String(difference),
      notes: parsed.data.notes ?? null,
      status: 'closed',
      updatedAt: new Date(),
    })
    .where(eq(shiftSessions.id, shift[0].id))

  return NextResponse.json({
    ok: true,
    expectedBalance: expected,
    difference,
  })
}
