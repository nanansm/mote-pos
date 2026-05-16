import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { shiftSessions, cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { getShiftPaymentSummary } from '@/lib/shifts/summary'

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
      closedReason: shiftSessions.closedReason,
      autoClosed: shiftSessions.autoClosed,
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

  const summary = await getShiftPaymentSummary(id, ctx.workspaceId)
  const expected = Number(shift[0].openingBalance ?? 0) + summary.cashIn

  const byMethod: Record<string, { total: number; count: number }> = {}
  for (const item of summary.breakdown) {
    byMethod[item.method] = { total: item.amount, count: item.count }
  }

  return NextResponse.json({
    shift: shift[0],
    summary: {
      breakdown: summary.breakdown,
      byMethod,
      totalAll: summary.total,
      totalCount: summary.txCount,
      cashIn: summary.cashIn,
      expectedBalance: expected,
    },
  })
}
