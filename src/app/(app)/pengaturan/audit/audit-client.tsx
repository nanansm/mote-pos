'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Download, ShieldAlert } from 'lucide-react'
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
import { BackLink } from '@/components/back-link'
import { formatRupiah } from '@/lib/format'

type Row = {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: string
  cashierName: string | null
}

const ACTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'price_override', label: 'Price Override' },
  { value: 'void', label: 'Void' },
  { value: 'refund', label: 'Refund' },
  { value: 'discount_manual', label: 'Diskon Manual' },
  { value: 'debt_pay', label: 'Bayar Hutang' },
  { value: 'shift_close_offline', label: 'Tutup Shift Offline' },
  { value: 'pin_failed', label: 'PIN Gagal' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function isoNDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function describe(row: Row): string {
  if (row.action === 'price_override') {
    const oldP = (row.oldValue as { priceUnit?: number })?.priceUnit ?? 0
    const newP = (row.newValue as { priceUnit?: number })?.priceUnit ?? 0
    return `${formatRupiah(Number(oldP))} → ${formatRupiah(Number(newP))}`
  }
  if (row.action === 'void' || row.action === 'refund') {
    const reason = (row.metadata as { reason?: string })?.reason
    const amount = (row.metadata as { refundAmount?: number })?.refundAmount
    return `${reason ?? '—'}${amount ? ` • ${formatRupiah(amount)}` : ''}`
  }
  if (row.action === 'debt_pay') {
    const amount = (row.newValue as { amount?: number })?.amount ?? 0
    const method = (row.newValue as { method?: string })?.method ?? ''
    return `${formatRupiah(Number(amount))} via ${method}`
  }
  if (row.action === 'pin_failed') {
    const attempted = (row.metadata as { attempted?: string })?.attempted
    return `Gagal verifikasi PIN untuk: ${attempted ?? '?'}`
  }
  return row.entityType ?? ''
}

function escapeCsv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function AuditClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [action, setAction] = useState<string>('all')
  const [from, setFrom] = useState(isoNDaysAgo(7))
  const [to, setTo] = useState(todayISO())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (action !== 'all') p.set('action', action)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const res = await fetch(`/api/audit-logs?${p}`)
    const j = await res.json()
    setRows(j.data ?? [])
    setLoading(false)
  }, [action, from, to])

  useEffect(() => {
    load()
  }, [load])

  const exportCsv = () => {
    const header = 'time,action,entity,detail,cashier\n'
    const body = rows
      .map((r) =>
        [
          escapeCsv(new Date(r.createdAt).toISOString()),
          r.action,
          escapeCsv(r.entityType ?? ''),
          escapeCsv(describe(r)),
          escapeCsv(r.cashierName ?? ''),
        ].join(','),
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <BackLink href="/pengaturan" />
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <ShieldAlert className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Riwayat aksi sensitif: override, void, refund, hutang.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label>Aksi</Label>
          <Select value={action} onValueChange={(v) => setAction(v ?? 'all')}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af">From</Label>
          <Input id="af" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="at">To</Label>
          <Input id="at" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={load} className="font-semibold">Apply</Button>
        <Button onClick={exportCsv} variant="outline" className="gap-2 sm:ml-auto" disabled={rows.length === 0}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Belum ada audit log dalam filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Waktu</th>
                  <th className="px-5 py-2.5 font-semibold">Aksi</th>
                  <th className="px-5 py-2.5 font-semibold">Entity</th>
                  <th className="px-5 py-2.5 font-semibold">Detail</th>
                  <th className="px-5 py-2.5 font-semibold">Kasir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        r.action === 'pin_failed' ? 'bg-destructive/10 text-destructive'
                        : r.action === 'price_override' ? 'bg-warning/10 text-warning'
                        : r.action === 'void' || r.action === 'refund' ? 'bg-warning/10 text-warning'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                        {r.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground text-xs">
                      {r.entityType ?? '—'}{r.entityId ? ` (${r.entityId.slice(0, 8)}…)` : ''}
                    </td>
                    <td className="px-5 py-2.5">{describe(r)}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{r.cashierName ?? '—'}</td>
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
