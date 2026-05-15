import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/owner-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CountRow = { c: string }

export async function GET() {
  await requireOwner()

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [users, workspaces, outlets, trx, gmvAll, gmvMonth, openShifts, newSignups] =
    await Promise.all([
      db.execute<CountRow>(sql`SELECT COUNT(*)::text AS c FROM mote_pos."user"`),
      db.execute<CountRow>(sql`SELECT COUNT(*)::text AS c FROM mote_pos.workspaces`),
      db.execute<CountRow>(sql`SELECT COUNT(*)::text AS c FROM mote_pos.outlets`),
      db.execute<CountRow>(
        sql`SELECT COUNT(*)::text AS c FROM mote_pos.transactions WHERE status = 'completed'`,
      ),
      db.execute<CountRow>(
        sql`SELECT COALESCE(SUM(total),0)::text AS c FROM mote_pos.transactions WHERE status = 'completed'`,
      ),
      db.execute<CountRow>(
        sql`SELECT COALESCE(SUM(total),0)::text AS c FROM mote_pos.transactions WHERE status = 'completed' AND trx_date >= ${monthStart}`,
      ),
      db.execute<CountRow>(
        sql`SELECT COUNT(*)::text AS c FROM mote_pos.shift_sessions WHERE status = 'open'`,
      ),
      db.execute<CountRow>(
        sql`SELECT COUNT(*)::text AS c FROM mote_pos."user" WHERE created_at >= ${weekAgo}`,
      ),
    ])
  return NextResponse.json({
    users: Number(users.rows[0]?.c ?? 0),
    workspaces: Number(workspaces.rows[0]?.c ?? 0),
    outlets: Number(outlets.rows[0]?.c ?? 0),
    transactions: Number(trx.rows[0]?.c ?? 0),
    gmvAllTime: Number(gmvAll.rows[0]?.c ?? 0),
    gmvThisMonth: Number(gmvMonth.rows[0]?.c ?? 0),
    activeShifts: Number(openShifts.rows[0]?.c ?? 0),
    newSignups7d: Number(newSignups.rows[0]?.c ?? 0),
  })
}
