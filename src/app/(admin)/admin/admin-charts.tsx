'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatRupiah } from '@/lib/format'

type SignupRow = { day: string; count: number }
type TrxRow = { day: string; count: number; total: number }
type MonthRow = { month: string; total: number }

const BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

function formatDay(d: string) {
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

function formatMonth(m: string) {
  const [year, mon] = m.split('-')
  return `${BULAN[Number(mon) - 1]} ${year.slice(2)}`
}

export function AdminCharts({
  signupsByDay,
  trxByDay,
  gmvByMonth,
}: {
  signupsByDay: SignupRow[]
  trxByDay: TrxRow[]
  gmvByMonth: MonthRow[]
}) {
  const signupData = signupsByDay.map((r) => ({ x: formatDay(r.day), value: r.count }))
  const trxData = trxByDay.map((r) => ({ x: formatDay(r.day), value: r.count }))
  const gmvData = gmvByMonth.map((r) => ({ x: formatMonth(r.month), value: r.total }))

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="Signup per Hari (30 hari)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={signupData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#EAB308"
              strokeWidth={2}
              dot={{ r: 2, fill: '#EAB308' }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Transaksi per Hari (30 hari)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trxData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0EA5E9"
              strokeWidth={2}
              dot={{ r: 2, fill: '#0EA5E9' }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="GMV per Bulan (6 bulan)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={gmvData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              stroke="#334155"
              tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v))}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(v) => [formatRupiah(Number(v ?? 0)), 'GMV']}
            />
            <Bar dataKey="value" fill="#16A34A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-sm font-bold mb-3">{title}</h3>
      {children}
    </div>
  )
}
