import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  productId: string
  productName: string
  categoryName: string | null
  qty: string
  total: string
}

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
  const sort = url.searchParams.get('sort') === 'total' ? 'total' : 'qty'

  const rows = await db.execute<Row>(sql`
    SELECT ti.product_id AS "productId",
           ti.product_name AS "productName",
           cat.name AS "categoryName",
           SUM(ti.quantity)::text AS qty,
           SUM(ti.subtotal)::text AS total
    FROM mote_pos.transaction_items ti
    INNER JOIN mote_pos.transactions t ON t.id = ti.transaction_id
    LEFT JOIN mote_pos.products p ON p.id = ti.product_id
    LEFT JOIN mote_pos.categories cat ON cat.id = p.category_id
    WHERE t.workspace_id = ${ctx.workspaceId}
      AND t.status = 'completed'
      AND t.trx_date >= ${from} AND t.trx_date <= ${to}
    GROUP BY ti.product_id, ti.product_name, cat.name
    ORDER BY ${sql.raw(sort === 'qty' ? 'SUM(ti.quantity)' : 'SUM(ti.subtotal)')} DESC
  `)

  const data = rows.rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    categoryName: r.categoryName,
    qty: Number(r.qty),
    total: Number(r.total),
  }))
  const grandTotal = data.reduce((s, r) => s + r.total, 0)
  return NextResponse.json({
    data: data.map((d) => ({
      ...d,
      pct: grandTotal > 0 ? (d.total / grandTotal) * 100 : 0,
    })),
    grandTotal,
    from: from.toISOString(),
    to: to.toISOString(),
  })
}
