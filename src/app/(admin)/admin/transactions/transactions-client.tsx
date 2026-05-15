'use client'

import { useEffect, useState } from 'react'
import { Loader2, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'

type Row = {
  workspaceId: string
  workspaceName: string
  trxCount: number
  gmvTotal: number
  avgPerTrx: number
}
type ApiResp = { data: Row[]; from: string; to: string }

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}
function isoNDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function AdminTransactionsClient() {
  const [from, setFrom] = useState(isoNDaysAgo(30))
  const [to, setTo] = useState(todayISO())
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    const res = await fetch(`/api/admin/transactions/summary?${params.toString()}`)
    const j: ApiResp = await res.json()
    setRows(j.data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportCsv = () => {
    const header = 'workspace,trx_count,gmv_total,avg_per_trx\n'
    const body = rows
      .map((r) =>
        [
          `"${r.workspaceName.replace(/"/g, '""')}"`,
          r.trxCount,
          r.gmvTotal,
          Math.round(r.avgPerTrx),
        ].join(','),
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-summary-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalTrx = rows.reduce((acc, r) => acc + r.trxCount, 0)
  const totalGmv = rows.reduce((acc, r) => acc + r.gmvTotal, 0)

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-slate-400 mt-1">
          Ringkasan transaksi per workspace. Detail per-transaksi tidak ditampilkan (privacy).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from" className="text-slate-300">From</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to" className="text-slate-300">To</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100"
          />
        </div>
        <Button onClick={load} className="gap-2">
          Apply
        </Button>
        <Button onClick={exportCsv} variant="outline" className="gap-2 bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 sm:ml-auto" disabled={!rows.length}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total Workspaces" value={String(rows.length)} />
        <SummaryCard label="Total Transaksi" value={totalTrx.toLocaleString('id-ID')} />
        <SummaryCard label="Total GMV" value={formatRupiah(totalGmv)} />
        <SummaryCard
          label="Rata-rata GMV/ws"
          value={rows.length ? formatRupiah(Math.round(totalGmv / rows.length)) : 'Rp 0'}
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Tidak ada transaksi dalam range tanggal ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 text-slate-400 text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Workspace</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Trx Count</th>
                  <th className="px-5 py-2.5 font-semibold text-right">GMV</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Avg/Trx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.workspaceId} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-semibold">{r.workspaceName}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                      {r.trxCount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                      {formatRupiah(r.gmvTotal)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                      {formatRupiah(Math.round(r.avgPerTrx))}
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
