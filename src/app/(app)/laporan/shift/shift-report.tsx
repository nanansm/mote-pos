'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatRupiah } from '@/lib/format'

type Row = {
  id: string
  cashier: string
  outlet: string
  openedAt: string
  closedAt: string | null
  status: string
  trxCount: number
  totalSales: number
  openingBalance: number
  closingBalance: number | null
  difference: number | null
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function isoNDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function formatJam(s: string) {
  return new Date(s).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ShiftReport() {
  const [from, setFrom] = useState(isoNDaysAgo(30))
  const [to, setTo] = useState(todayISO())
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    const res = await fetch(`/api/reports/shifts?${params.toString()}`)
    const j = await res.json()
    setRows(j.data ?? [])
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

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
        <Button onClick={load} className="font-semibold">Apply</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Belum ada shift dalam range ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Kasir</th>
                  <th className="px-4 py-2.5 font-semibold">Outlet</th>
                  <th className="px-4 py-2.5 font-semibold">Buka</th>
                  <th className="px-4 py-2.5 font-semibold">Tutup</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Trx</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Total</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Selisih</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-semibold">{r.cashier}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.outlet}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatJam(r.openedAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.closedAt ? formatJam(r.closedAt) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.trxCount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      {formatRupiah(r.totalSales)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                      r.difference == null
                        ? 'text-muted-foreground'
                        : r.difference >= 0
                        ? 'text-success'
                        : 'text-destructive'
                    }`}>
                      {r.difference == null
                        ? '—'
                        : (r.difference >= 0 ? '+' : '') + formatRupiah(r.difference).replace('Rp ', 'Rp ')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        r.status === 'open' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
