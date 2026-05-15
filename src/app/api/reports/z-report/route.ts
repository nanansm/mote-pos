import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CountRow = { c: string }
type CategoryRow = { name: string | null; total: string }
type CashierRow = { name: string; total: string }
type MethodRow = { method: string; total: string; count: string }

function parseDate(s: string | null): Date {
  if (!s) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) {
    const fallback = new Date()
    fallback.setHours(0, 0, 0, 0)
    return fallback
  }
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const start = parseDate(url.searchParams.get('date'))
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  end.setMilliseconds(end.getMilliseconds() - 1)

  const [
    summary,
    methods,
    categories,
    cashiers,
    refundsAgg,
    voidsAgg,
    discountsAgg,
  ] = await Promise.all([
    db.execute<CountRow & { totalSales: string }>(sql`
      SELECT COUNT(*)::text AS c, COALESCE(SUM(total),0)::text AS "totalSales"
      FROM mote_pos.transactions
      WHERE workspace_id = ${ctx.workspaceId} AND status = 'completed'
        AND trx_date >= ${start} AND trx_date <= ${end}
    `),
    db.execute<MethodRow>(sql`
      SELECT tp.method, COALESCE(SUM(tp.amount),0)::text AS total, COUNT(*)::text AS count
      FROM mote_pos.transaction_payments tp
      INNER JOIN mote_pos.transactions t ON t.id = tp.transaction_id
      WHERE t.workspace_id = ${ctx.workspaceId} AND t.status = 'completed'
        AND t.trx_date >= ${start} AND t.trx_date <= ${end}
      GROUP BY tp.method
      ORDER BY SUM(tp.amount) DESC
    `),
    db.execute<CategoryRow>(sql`
      SELECT COALESCE(c.name, 'Tanpa Kategori') AS name,
             COALESCE(SUM(ti.subtotal),0)::text AS total
      FROM mote_pos.transaction_items ti
      INNER JOIN mote_pos.transactions t ON t.id = ti.transaction_id
      LEFT JOIN mote_pos.products p ON p.id = ti.product_id
      LEFT JOIN mote_pos.categories c ON c.id = p.category_id
      WHERE t.workspace_id = ${ctx.workspaceId} AND t.status = 'completed'
        AND t.trx_date >= ${start} AND t.trx_date <= ${end}
      GROUP BY c.name
      ORDER BY SUM(ti.subtotal) DESC
    `),
    db.execute<CashierRow>(sql`
      SELECT cs.name, COALESCE(SUM(t.total),0)::text AS total
      FROM mote_pos.transactions t
      INNER JOIN mote_pos.cashiers cs ON cs.id = t.cashier_id
      WHERE t.workspace_id = ${ctx.workspaceId} AND t.status = 'completed'
        AND t.trx_date >= ${start} AND t.trx_date <= ${end}
      GROUP BY cs.name
      ORDER BY SUM(t.total) DESC
    `),
    db.execute<CountRow & { total: string }>(sql`
      SELECT COUNT(*)::text AS c, COALESCE(SUM(refund_amount),0)::text AS total
      FROM mote_pos.refunds
      WHERE workspace_id = ${ctx.workspaceId}
        AND created_at >= ${start} AND created_at <= ${end}
    `),
    db.execute<CountRow & { total: string }>(sql`
      SELECT COUNT(*)::text AS c, COALESCE(SUM(total),0)::text AS total
      FROM mote_pos.transactions
      WHERE workspace_id = ${ctx.workspaceId} AND status = 'voided'
        AND voided_at >= ${start} AND voided_at <= ${end}
    `),
    db.execute<{ total: string }>(sql`
      SELECT COALESCE(SUM(discount),0)::text AS total
      FROM mote_pos.transactions
      WHERE workspace_id = ${ctx.workspaceId} AND status = 'completed'
        AND trx_date >= ${start} AND trx_date <= ${end}
    `),
  ])

  return NextResponse.json({
    date: start.toISOString().slice(0, 10),
    summary: {
      transactionCount: Number(summary.rows[0]?.c ?? 0),
      totalSales: Number(summary.rows[0]?.totalSales ?? 0),
    },
    byMethod: methods.rows.map((r) => ({
      method: r.method,
      total: Number(r.total),
      count: Number(r.count),
    })),
    byCategory: categories.rows.map((r) => ({
      name: r.name ?? 'Tanpa Kategori',
      total: Number(r.total),
    })),
    byCashier: cashiers.rows.map((r) => ({
      name: r.name,
      total: Number(r.total),
    })),
    adjustments: {
      refundCount: Number(refundsAgg.rows[0]?.c ?? 0),
      refundTotal: Number(refundsAgg.rows[0]?.total ?? 0),
      voidCount: Number(voidsAgg.rows[0]?.c ?? 0),
      voidTotal: Number(voidsAgg.rows[0]?.total ?? 0),
      discountTotal: Number(discountsAgg.rows[0]?.total ?? 0),
    },
  })
}
