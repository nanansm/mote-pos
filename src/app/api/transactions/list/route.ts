import { NextResponse } from 'next/server'
import { and, desc, eq, gte, lte, ilike, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, cashiers, shiftSessions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')?.trim() ?? ''
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const shiftOnly = url.searchParams.get('shift_active') === '1'
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))

  const conds = [eq(transactions.workspaceId, ctx.workspaceId)]
  if (status === 'completed' || status === 'voided' || status === 'refunded') {
    conds.push(eq(transactions.status, status))
  }
  if (search) {
    conds.push(ilike(transactions.trxNumber, `%${search}%`))
  }
  if (from) {
    const d = new Date(from)
    if (!isNaN(d.getTime())) conds.push(gte(transactions.trxDate, d))
  }
  if (to) {
    const d = new Date(to)
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      conds.push(lte(transactions.trxDate, d))
    }
  }
  if (shiftOnly) {
    const open = await db
      .select({ id: shiftSessions.id })
      .from(shiftSessions)
      .where(
        and(eq(shiftSessions.workspaceId, ctx.workspaceId), eq(shiftSessions.status, 'open')),
      )
      .limit(1)
    if (open[0]) conds.push(eq(transactions.shiftId, open[0].id))
  }

  const rows = await db
    .select({
      id: transactions.id,
      trxNumber: transactions.trxNumber,
      trxDate: transactions.trxDate,
      total: transactions.total,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
      cashierName: cashiers.name,
      itemCount: sql<number>`(SELECT COUNT(*)::int FROM mote_pos.transaction_items ti WHERE ti.transaction_id = ${transactions.id})`,
    })
    .from(transactions)
    .innerJoin(cashiers, eq(cashiers.id, transactions.cashierId))
    .where(and(...conds))
    .orderBy(desc(transactions.trxDate))
    .limit(limit)

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      total: Number(r.total),
    })),
  })
}
