'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatRupiah } from '@/lib/format'

type Resp = {
  summary: { total: number; count: number; items: number; avgPerTrx: number }
  byMethod: { method: string; total: number; count: number }[]
  series: { bucket: string; total: number; count: number }[]
  oneDay: boolean
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function SalesReport() {
  const [from, setFrom] = useState(todayISO())
  const [to, setTo] = useState(todayISO())
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    const res = await fetch(`/api/reports/sales?${params.toString()}`)
    const j: Resp = await res.json()
    setData(j)
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const total = data?.summary.total ?? 0
  const count = data?.summary.count ?? 0
  const items = data?.summary.items ?? 0
  const avg = data?.summary.avgPerTrx ?? 0

  const cards = [
    { label: 'Total Penjualan', value: formatRupiah(total) },
    { label: 'Jumlah Transaksi', value: String(count) },
    { label: 'Rata-rata/Trx', value: formatRupiah(Math.round(avg)) },
    { label: 'Item Terjual', value: String(items) },
  ]

  const series = (data?.series ?? []).map((s) => ({
    x: data?.oneDay ? s.bucket.slice(11, 16) : s.bucket.slice(5),
    value: s.total,
  }))

  const totalMethod = (data?.byMethod ?? []).reduce((s, m) => s + m.total, 0)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={load} className="font-semibold">
          Apply
        </Button>
        <a
          href={`/api/reports/sales/export?from=${from}&to=${to}`}
          className="sm:ml-auto inline-flex"
          download
        >
          <Button variant="outline" className="gap-2">
            <Download className="size-4" /> Export CSV
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              {c.label}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold mb-3">
          {data?.oneDay ? 'Penjualan per Jam' : 'Penjualan per Hari'}
        </h3>
        {loading ? (
          <div className="h-[240px] flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : series.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada data dalam range ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
              <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#78716C' }} stroke="#E7E5E4" />
              <YAxis
                tick={{ fontSize: 11, fill: '#78716C' }}
                stroke="#E7E5E4"
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)
                }
              />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [formatRupiah(Number(v ?? 0)), 'Total']}
              />
              <Line type="monotone" dataKey="value" stroke="#EAB308" strokeWidth={2} dot={{ r: 2, fill: '#EAB308' }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold">Breakdown per Metode Bayar</h3>
        </div>
        {(data?.byMethod ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada data.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Metode</th>
                <th className="px-5 py-2.5 font-semibold text-right">Transaksi</th>
                <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                <th className="px-5 py-2.5 font-semibold text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.byMethod ?? []).map((m) => (
                <tr key={m.method}>
                  <td className="px-5 py-2.5 font-semibold uppercase">{m.method}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.count}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(m.total)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
                    {totalMethod > 0 ? `${((m.total / totalMethod) * 100).toFixed(1)}%` : '—'}
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
