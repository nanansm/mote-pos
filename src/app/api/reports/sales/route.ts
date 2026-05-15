import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SeriesRow = { bucket: string; total: string; count: string }
type MethodRow = { method: string; total: string; count: string }
type SummaryRow = { total: string; count: string; items: string }

function parseRange(url: URL) {
  const fromStr = url.searchParams.get('from')
  const toStr = url.searchParams.get('to')
  const from = fromStr ? new Date(fromStr) : new Date()
  if (!fromStr) from.setHours(0, 0, 0, 0)
  const to = toStr ? new Date(toStr) : new Date()
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const { from, to } = parseRange(url)
  const oneDay = to.getTime() - from.getTime() < 36 * 60 * 60 * 1000
  const bucket = oneDay
    ? sql`to_char(date_trunc('hour', trx_date), 'YYYY-MM-DD HH24:00')`
    : sql`to_char(trx_date::date, 'YYYY-MM-DD')`

  const [summary, byMethod, series] = await Promise.all([
    db.execute<SummaryRow>(sql`
      SELECT COALESCE(SUM(total),0)::text AS total,
             COUNT(*)::text AS count,
             COALESCE((SELECT SUM(ti.quantity)::text FROM mote_pos.transaction_items ti
                       JOIN mote_pos.transactions t ON t.id = ti.transaction_id
                       WHERE t.workspace_id = ${ctx.workspaceId} AND t.status = 'completed'
                         AND t.trx_date >= ${from} AND t.trx_date <= ${to}), '0') AS items
      FROM mote_pos.transactions
      WHERE workspace_id = ${ctx.workspaceId} AND status = 'completed'
        AND trx_date >= ${from} AND trx_date <= ${to}
    `),
    db.execute<MethodRow>(sql`
      SELECT payment_method::text AS method,
             COALESCE(SUM(total),0)::text AS total,
             COUNT(*)::text AS count
      FROM mote_pos.transactions
      WHERE workspace_id = ${ctx.workspaceId} AND status = 'completed'
        AND trx_date >= ${from} AND trx_date <= ${to}
      GROUP BY payment_method
    `),
    db.execute<SeriesRow>(sql`
      SELECT ${bucket} AS bucket,
             COALESCE(SUM(total),0)::text AS total,
             COUNT(*)::text AS count
      FROM mote_pos.transactions
      WHERE workspace_id = ${ctx.workspaceId} AND status = 'completed'
        AND trx_date >= ${from} AND trx_date <= ${to}
      GROUP BY bucket
      ORDER BY bucket
    `),
  ])

  const total = Number(summary.rows[0]?.total ?? 0)
  const count = Number(summary.rows[0]?.count ?? 0)
  const items = Number(summary.rows[0]?.items ?? 0)

  return NextResponse.json({
    summary: {
      total,
      count,
      items,
      avgPerTrx: count > 0 ? total / count : 0,
    },
    byMethod: byMethod.rows.map((r) => ({
      method: r.method,
      total: Number(r.total),
      count: Number(r.count),
    })),
    series: series.rows.map((r) => ({
      bucket: r.bucket,
      total: Number(r.total),
      count: Number(r.count),
    })),
    oneDay,
    from: from.toISOString(),
    to: to.toISOString(),
  })
}
