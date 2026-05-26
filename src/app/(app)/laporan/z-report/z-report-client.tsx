'use client'

import { useCallback, useEffect, useState } from 'react'
import { Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatRupiah } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/payment-methods/labels'

type Resp = {
  date: string
  summary: { transactionCount: number; totalSales: number }
  byMethod: { method: string; total: number; count: number }[]
  byCategory: { name: string; total: number }[]
  byCashier: { name: string; total: number }[]
  adjustments: {
    refundCount: number
    refundTotal: number
    voidCount: number
    voidTotal: number
    discountTotal: number
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ZReportClient() {
  const [date, setDate] = useState(todayISO())
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/reports/z-report?date=${date}`)
    const j: Resp = await res.json()
    setData(j)
    setLoading(false)
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  const printZ = () => {
    window.open(`/print/z-report/${date}`, '_blank', 'width=480,height=720')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="zd">Tanggal</Label>
          <Input id="zd" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={load} className="font-semibold">Apply</Button>
        <Button onClick={printZ} variant="outline" className="gap-2 sm:ml-auto" disabled={loading}>
          <Printer className="size-4" /> Cetak Z-Report
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat…
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Tidak ada data.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card label="Total Penjualan" value={formatRupiah(data.summary.totalSales)} />
            <Card label="Jumlah Transaksi" value={String(data.summary.transactionCount)} />
          </div>

          <Section title="Per Metode Bayar">
            <SimpleTable
              rows={data.byMethod.map((m) => ({
                left: getPaymentMethodLabel(m.method),
                mid: String(m.count),
                right: formatRupiah(m.total),
              }))}
              cols={['Metode', 'Count', 'Total']}
            />
          </Section>

          <Section title="Per Kategori">
            <SimpleTable
              rows={data.byCategory.map((c) => ({
                left: c.name,
                right: formatRupiah(c.total),
              }))}
              cols={['Kategori', 'Total']}
            />
          </Section>

          <Section title="Per Kasir">
            <SimpleTable
              rows={data.byCashier.map((c) => ({
                left: c.name,
                right: formatRupiah(c.total),
              }))}
              cols={['Kasir', 'Total']}
            />
          </Section>

          <Section title="Adjustments">
            <SimpleTable
              rows={[
                {
                  left: `Refund (${data.adjustments.refundCount}x)`,
                  right: formatRupiah(data.adjustments.refundTotal),
                },
                {
                  left: `Void (${data.adjustments.voidCount}x)`,
                  right: formatRupiah(data.adjustments.voidTotal),
                },
                { left: 'Diskon Total', right: formatRupiah(data.adjustments.discountTotal) },
              ]}
              cols={['Jenis', 'Total']}
            />
          </Section>
        </>
      )}
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-lg sm:text-2xl font-bold tabular-nums leading-tight break-words">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function SimpleTable({
  rows,
  cols,
}: {
  rows: { left: string; mid?: string; right: string }[]
  cols: string[]
}) {
  if (rows.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada data.</div>
  }
  const hasMid = cols.length === 3
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
        <tr>
          <th className="px-5 py-2 font-semibold">{cols[0]}</th>
          {hasMid && <th className="px-5 py-2 font-semibold text-right">{cols[1]}</th>}
          <th className="px-5 py-2 font-semibold text-right">{cols[hasMid ? 2 : 1]}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="px-5 py-2">{r.left}</td>
            {hasMid && <td className="px-5 py-2 text-right tabular-nums">{r.mid}</td>}
            <td className="px-5 py-2 text-right tabular-nums font-semibold">{r.right}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
