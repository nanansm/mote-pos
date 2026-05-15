import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/owner-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  workspaceId: string
  workspaceName: string
  trxCount: string
  gmvTotal: string
}

function parseDate(s: string | null, fallback: Date) {
  if (!s) return fallback
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? fallback : d
}

export async function GET(req: Request) {
  await requireOwner()
  const url = new URL(req.url)
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 30)
  defaultFrom.setHours(0, 0, 0, 0)
  const defaultTo = new Date()
  defaultTo.setHours(23, 59, 59, 999)

  const from = parseDate(url.searchParams.get('from'), defaultFrom)
  const to = parseDate(url.searchParams.get('to'), defaultTo)
  // Treat the to date as end-of-day
  to.setHours(23, 59, 59, 999)

  const res = await db.execute<Row>(sql`
    SELECT w.id AS "workspaceId", w.name AS "workspaceName",
      COUNT(t.id)::text AS "trxCount",
      COALESCE(SUM(t.total), 0)::text AS "gmvTotal"
    FROM mote_pos.workspaces w
    LEFT JOIN mote_pos.transactions t
      ON t.workspace_id = w.id
      AND t.status = 'completed'
      AND t.trx_date >= ${from}
      AND t.trx_date <= ${to}
    GROUP BY w.id, w.name
    HAVING COUNT(t.id) > 0
    ORDER BY SUM(t.total) DESC NULLS LAST
  `)

  const data = res.rows.map((r) => {
    const trxCount = Number(r.trxCount)
    const gmvTotal = Number(r.gmvTotal)
    return {
      workspaceId: r.workspaceId,
      workspaceName: r.workspaceName,
      trxCount,
      gmvTotal,
      avgPerTrx: trxCount > 0 ? gmvTotal / trxCount : 0,
    }
  })
  return NextResponse.json({
    data,
    from: from.toISOString(),
    to: to.toISOString(),
  })
}
