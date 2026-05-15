import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  cashier: string
  outlet: string
  openedAt: Date
  closedAt: Date | null
  status: string
  trxCount: string
  totalSales: string
  difference: string | null
  openingBalance: string
  closingBalance: string | null
}

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const fromStr = url.searchParams.get('from')
  const toStr = url.searchParams.get('to')
  const from = fromStr ? new Date(fromStr) : new Date()
  if (!fromStr) {
    from.setDate(from.getDate() - 30)
    from.setHours(0, 0, 0, 0)
  }
  const to = toStr ? new Date(toStr) : new Date()
  to.setHours(23, 59, 59, 999)

  const rows = await db.execute<Row>(sql`
    SELECT s.id, c.name AS cashier, o.name AS outlet,
           s.opened_at AS "openedAt",
           s.closed_at AS "closedAt",
           s.status::text,
           s.opening_balance::text AS "openingBalance",
           s.closing_balance::text AS "closingBalance",
           s.difference::text AS difference,
           COALESCE((SELECT COUNT(*)::int FROM mote_pos.transactions t WHERE t.shift_id = s.id AND t.status = 'completed'), 0)::text AS "trxCount",
           COALESCE((SELECT SUM(t.total) FROM mote_pos.transactions t WHERE t.shift_id = s.id AND t.status = 'completed'), 0)::text AS "totalSales"
    FROM mote_pos.shift_sessions s
    INNER JOIN mote_pos.cashiers c ON c.id = s.cashier_id
    INNER JOIN mote_pos.outlets o ON o.id = s.outlet_id
    WHERE s.workspace_id = ${ctx.workspaceId}
      AND s.opened_at >= ${from}
      AND s.opened_at <= ${to}
    ORDER BY s.opened_at DESC
  `)

  return NextResponse.json({
    data: rows.rows.map((r) => ({
      id: r.id,
      cashier: r.cashier,
      outlet: r.outlet,
      openedAt: r.openedAt,
      closedAt: r.closedAt,
      status: r.status,
      trxCount: Number(r.trxCount),
      totalSales: Number(r.totalSales),
      openingBalance: Number(r.openingBalance),
      closingBalance: r.closingBalance != null ? Number(r.closingBalance) : null,
      difference: r.difference != null ? Number(r.difference) : null,
    })),
  })
}
