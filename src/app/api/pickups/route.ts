import { NextResponse } from 'next/server'
import { and, desc, eq, gte, sql, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  transactions,
  transactionItems,
} from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'pending'
  const q = url.searchParams.get('q')?.trim() ?? ''
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const conds = [
    eq(transactions.workspaceId, ctx.workspaceId),
    eq(transactions.status, 'completed'),
  ]
  if (status === 'pending') conds.push(eq(transactions.pickupStatus, 'pickup_pending'))
  if (status === 'completed') conds.push(eq(transactions.pickupStatus, 'pickup_completed'))
  if (from) conds.push(gte(transactions.trxDate, new Date(from)))
  if (to) conds.push(sql`${transactions.trxDate} <= ${new Date(to)}`)

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conds))
    .orderBy(desc(transactions.trxDate))
    .limit(300)

  const ids = rows.map((r) => r.id)
  const itemCounts = ids.length
    ? await db
        .select({
          transactionId: transactionItems.transactionId,
          count: sql<number>`COUNT(*)::int`,
          qty: sql<number>`SUM(${transactionItems.quantity})::int`,
        })
        .from(transactionItems)
        .where(inArray(transactionItems.transactionId, ids))
        .groupBy(transactionItems.transactionId)
    : []
  const countMap = new Map<string, { count: number; qty: number }>()
  for (const c of itemCounts) {
    countMap.set(c.transactionId, { count: c.count, qty: c.qty })
  }

  const filtered = q
    ? rows.filter(
        (r) =>
          r.trxNumber.toLowerCase().includes(q.toLowerCase()) ||
          (r.customerName ?? '').toLowerCase().includes(q.toLowerCase()) ||
          (r.customerPhone ?? '').includes(q),
      )
    : rows

  // Stats
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const pendingStats = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, ctx.workspaceId),
        eq(transactions.pickupStatus, 'pickup_pending'),
      ),
    )
  const monthDoneStats = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, ctx.workspaceId),
        eq(transactions.pickupStatus, 'pickup_completed'),
        gte(transactions.pickupAt, monthStart),
      ),
    )

  return NextResponse.json({
    data: filtered.map((r) => ({
      id: r.id,
      trxNumber: r.trxNumber,
      trxDate: r.trxDate,
      total: Number(r.total),
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      pickupStatus: r.pickupStatus,
      pickupAt: r.pickupAt,
      pickupNotes: r.pickupNotes,
      items: countMap.get(r.id)?.count ?? 0,
      qty: countMap.get(r.id)?.qty ?? 0,
    })),
    stats: {
      pending: Number(pendingStats[0]?.c ?? 0),
      monthDone: Number(monthDoneStats[0]?.c ?? 0),
    },
  })
}
