import { sql } from 'drizzle-orm'
import {
  Users as UsersIcon,
  Store,
  Building2,
  Receipt,
  Wallet,
  TrendingUp,
  PlayCircle,
  UserPlus,
} from 'lucide-react'
import { db } from '@/lib/db'
import { formatRupiah } from '@/lib/format'
import { AdminCharts } from './admin-charts'

export const dynamic = 'force-dynamic'

type CountRow = { c: string }
type TrendRow = { day: string; count: string; total: string }
type RecentUser = {
  id: string
  name: string
  email: string
  createdAt: Date
  workspaceName: string | null
}

export default async function AdminOverviewPage() {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const [
    userCountRows,
    workspaceCountRows,
    outletCountRows,
    trxCountRows,
    gmvAllRows,
    gmvMonthRows,
    activeShiftRows,
    newSignupsRows,
    signupsByDayRows,
    trxByDayRows,
    gmvByMonthRows,
    recentUsersRows,
  ] = await Promise.all([
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
    db.execute<TrendRow>(sql`
      SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day,
             COUNT(*)::text AS count,
             '0' AS total
      FROM mote_pos."user"
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY day
      ORDER BY day
    `),
    db.execute<TrendRow>(sql`
      SELECT to_char(trx_date::date, 'YYYY-MM-DD') AS day,
             COUNT(*)::text AS count,
             COALESCE(SUM(total), 0)::text AS total
      FROM mote_pos.transactions
      WHERE status = 'completed' AND trx_date >= ${thirtyDaysAgo}
      GROUP BY day
      ORDER BY day
    `),
    db.execute<TrendRow>(sql`
      SELECT to_char(date_trunc('month', trx_date), 'YYYY-MM') AS day,
             COUNT(*)::text AS count,
             COALESCE(SUM(total), 0)::text AS total
      FROM mote_pos.transactions
      WHERE status = 'completed' AND trx_date >= ${sixMonthsAgo}
      GROUP BY day
      ORDER BY day
    `),
    db.execute<RecentUser>(sql`
      SELECT u.id, u.name, u.email, u.created_at AS "createdAt", w.name AS "workspaceName"
      FROM mote_pos."user" u
      LEFT JOIN mote_pos.workspaces w ON w.id = u.workspace_id
      ORDER BY u.created_at DESC
      LIMIT 10
    `),
  ])

  const userCount = Number(userCountRows.rows[0]?.c ?? 0)
  const workspaceCount = Number(workspaceCountRows.rows[0]?.c ?? 0)
  const outletCount = Number(outletCountRows.rows[0]?.c ?? 0)
  const trxCount = Number(trxCountRows.rows[0]?.c ?? 0)
  const gmvAll = Number(gmvAllRows.rows[0]?.c ?? 0)
  const gmvMonth = Number(gmvMonthRows.rows[0]?.c ?? 0)
  const activeShifts = Number(activeShiftRows.rows[0]?.c ?? 0)
  const newSignups = Number(newSignupsRows.rows[0]?.c ?? 0)

  const stats = [
    { label: 'Total Users', value: userCount.toLocaleString('id-ID'), Icon: UsersIcon },
    { label: 'Total Workspaces', value: workspaceCount.toLocaleString('id-ID'), Icon: Store },
    { label: 'Total Outlets', value: outletCount.toLocaleString('id-ID'), Icon: Building2 },
    { label: 'Total Transaksi', value: trxCount.toLocaleString('id-ID'), Icon: Receipt },
    { label: 'GMV All Time', value: formatRupiah(gmvAll), Icon: Wallet },
    { label: 'GMV Bulan Ini', value: formatRupiah(gmvMonth), Icon: TrendingUp },
    { label: 'Active Shifts', value: String(activeShifts), Icon: PlayCircle },
    { label: 'Signup 7 hari', value: String(newSignups), Icon: UserPlus },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-slate-400 mt-1">
          Ringkasan platform Mote POS across all workspaces.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                {s.label}
              </div>
              <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <s.Icon className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <AdminCharts
        signupsByDay={signupsByDayRows.rows.map((r) => ({
          day: r.day,
          count: Number(r.count),
        }))}
        trxByDay={trxByDayRows.rows.map((r) => ({
          day: r.day,
          count: Number(r.count),
          total: Number(r.total),
        }))}
        gmvByMonth={gmvByMonthRows.rows.map((r) => ({
          month: r.day,
          total: Number(r.total),
        }))}
      />

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-bold">Recent Signups</h2>
          <p className="text-xs text-slate-400 mt-0.5">10 user terbaru</p>
        </div>
        {recentUsersRows.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">Belum ada user.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 text-slate-400 text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Name</th>
                <th className="px-5 py-2.5 font-semibold">Email</th>
                <th className="px-5 py-2.5 font-semibold">Workspace</th>
                <th className="px-5 py-2.5 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentUsersRows.rows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-semibold">{u.name}</td>
                  <td className="px-5 py-3 text-slate-300">{u.email}</td>
                  <td className="px-5 py-3 text-slate-400">{u.workspaceName ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
