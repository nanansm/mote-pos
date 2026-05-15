import { NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { shiftSessions, transactions, cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params

  const shift = await db
    .select({
      id: shiftSessions.id,
      openedAt: shiftSessions.openedAt,
      closedAt: shiftSessions.closedAt,
      openingBalance: shiftSessions.openingBalance,
      closingBalance: shiftSessions.closingBalance,
      expectedBalance: shiftSessions.expectedBalance,
      difference: shiftSessions.difference,
      status: shiftSessions.status,
      cashierId: cashiers.id,
      cashierName: cashiers.name,
    })
    .from(shiftSessions)
    .innerJoin(cashiers, eq(cashiers.id, shiftSessions.cashierId))
    .where(
      and(
        eq(shiftSessions.id, id),
        eq(shiftSessions.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1)
  if (!shift[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const sums = await db
    .select({
      method: transactions.paymentMethod,
      total: sql<string>`COALESCE(SUM(${transactions.total}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .where(
      and(eq(transactions.shiftId, id), eq(transactions.status, 'completed')),
    )
    .groupBy(transactions.paymentMethod)

  const byMethod: Record<string, { total: number; count: number }> = {
    cash: { total: 0, count: 0 },
    qris: { total: 0, count: 0 },
    transfer: { total: 0, count: 0 },
  }
  let totalAll = 0
  let totalCount = 0
  for (const r of sums) {
    const v = { total: Number(r.total), count: r.count }
    byMethod[r.method] = v
    totalAll += v.total
    totalCount += v.count
  }
  const expected =
    Number(shift[0].openingBalance ?? 0) + (byMethod.cash?.total ?? 0)

  return NextResponse.json({
    shift: shift[0],
    summary: {
      byMethod,
      totalAll,
      totalCount,
      expectedBalance: expected,
    },
  })
}
