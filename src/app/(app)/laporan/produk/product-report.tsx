'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatRupiah } from '@/lib/format'

type Row = {
  productId: string
  productName: string
  categoryName: string | null
  qty: number
  total: number
  pct: number
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function isoNDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function ProductReport() {
  const [from, setFrom] = useState(isoNDaysAgo(7))
  const [to, setTo] = useState(todayISO())
  const [sort, setSort] = useState<'qty' | 'total'>('qty')
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to, sort })
    const res = await fetch(`/api/reports/products?${params.toString()}`)
    const j = await res.json()
    setData(j.data ?? [])
    setLoading(false)
  }, [from, to, sort])

  useEffect(() => {
    load()
  }, [load])

  const top10 = data.slice(0, 10).map((d) => ({
    name: d.productName.length > 16 ? d.productName.slice(0, 16) + '…' : d.productName,
    value: sort === 'qty' ? d.qty : d.total,
  }))

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
        <div className="space-y-1.5">
          <Label>Sort by</Label>
          <Select value={sort} onValueChange={(v) => setSort((v as 'qty' | 'total') ?? 'qty')}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qty">Qty Terjual</SelectItem>
              <SelectItem value="total">Total Penjualan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} className="font-semibold">Apply</Button>
        <a
          href={`/api/reports/products/export?from=${from}&to=${to}&sort=${sort}`}
          className="sm:ml-auto inline-flex"
          download
        >
          <Button variant="outline" className="gap-2">
            <Download className="size-4" /> Export CSV
          </Button>
        </a>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold mb-3">Top 10 Produk</h3>
        {loading ? (
          <div className="h-[260px] flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : top10.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            Tidak ada data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, top10.length * 28 + 30)}>
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#78716C' }}
                tickFormatter={(v: number) =>
                  sort === 'total'
                    ? v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)
                    : String(v)
                }
              />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#78716C' }} width={100} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [sort === 'total' ? formatRupiah(Number(v ?? 0)) : String(v), sort === 'total' ? 'Total' : 'Qty']}
              />
              <Bar dataKey="value" fill="#EAB308" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold w-12 text-right">#</th>
                <th className="px-5 py-2.5 font-semibold">Produk</th>
                <th className="px-5 py-2.5 font-semibold">Kategori</th>
                <th className="px-5 py-2.5 font-semibold text-right">Qty</th>
                <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                <th className="px-5 py-2.5 font-semibold text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">
                    Tidak ada data dalam range ini.
                  </td>
                </tr>
              ) : (
                data.map((r, i) => (
                  <tr key={r.productId} className="hover:bg-muted/30">
                    <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-2.5 font-semibold">{r.productName}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{r.categoryName ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{r.qty}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(r.total)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">{r.pct.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
