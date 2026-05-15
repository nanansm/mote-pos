import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  trxNumber: string
  trxDate: Date
  cashier: string
  paymentMethod: string
  subtotal: string
  discount: string
  total: string
  status: string
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

function escapeCsv(v: string | number) {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const { from, to } = parseRange(url)

  const rows = await db.execute<Row>(sql`
    SELECT t.trx_number AS "trxNumber",
           t.trx_date AS "trxDate",
           c.name AS cashier,
           t.payment_method::text AS "paymentMethod",
           t.subtotal::text,
           t.discount::text,
           t.total::text,
           t.status::text
    FROM mote_pos.transactions t
    INNER JOIN mote_pos.cashiers c ON c.id = t.cashier_id
    WHERE t.workspace_id = ${ctx.workspaceId}
      AND t.trx_date >= ${from} AND t.trx_date <= ${to}
    ORDER BY t.trx_date
  `)

  const header = 'trx_number,trx_date,cashier,payment_method,subtotal,discount,total,status\n'
  const body = rows.rows
    .map((r) =>
      [
        escapeCsv(r.trxNumber),
        new Date(r.trxDate).toISOString(),
        escapeCsv(r.cashier),
        r.paymentMethod,
        r.subtotal,
        r.discount,
        r.total,
        r.status,
      ].join(','),
    )
    .join('\n')
  const csv = header + body + '\n'

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="sales-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
    },
  })
}
