'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  ScrollText,
  Users,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatRupiah } from '@/lib/format'

type Debt = {
  id: string
  amount: number
  paidAmount: number
  status: 'open' | 'partial' | 'paid'
  notes: string | null
  transactionId: string | null
  createdAt: string
  customerId: string
  customerName: string
  customerPhone: string | null
}
type Resp = {
  data: Debt[]
  summary: { outstanding: number; customersCount: number; monthlyCreated: number }
}

export function HutangClient() {
  const params = useSearchParams()
  const presetDebtId = params.get('debt')
  const [list, setList] = useState<Debt[]>([])
  const [summary, setSummary] = useState<Resp['summary']>({ outstanding: 0, customersCount: 0, monthlyCreated: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'open' | 'partial' | 'paid'>('open')
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [payMethod, setPayMethod] = useState<'cash' | 'qris' | 'transfer'>('cash')
  const [payNotes, setPayNotes] = useState('')
  const [paying, setPaying] = useState(false)

  const openPay = useCallback((d: Debt) => {
    setPayTarget(d)
    setPayAmount(d.amount - d.paidAmount)
    setPayMethod('cash')
    setPayNotes('')
    setPayOpen(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (status !== 'all') p.set('status', status)
    if (search) p.set('search', search)
    const res = await fetch(`/api/debts?${p}`)
    const j: Resp = await res.json()
    setList(j.data ?? [])
    setSummary(j.summary ?? { outstanding: 0, customersCount: 0, monthlyCreated: 0 })
    setLoading(false)
    if (presetDebtId) {
      const target = (j.data ?? []).find((d) => d.id === presetDebtId)
      if (target) openPay(target)
    }
  }, [status, search, presetDebtId, openPay])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const submitPay = async () => {
    if (!payTarget) return
    const sisa = payTarget.amount - payTarget.paidAmount
    if (payAmount < 1 || payAmount > sisa) {
      toast.error('Jumlah bayar tidak valid')
      return
    }
    setPaying(true)
    const cashierId =
      typeof window !== 'undefined' ? localStorage.getItem('pos:cashier_id') : null
    const res = await fetch(`/api/debts/${payTarget.id}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: payAmount,
        method: payMethod,
        notes: payNotes || null,
        cashierId,
      }),
    })
    setPaying(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(j.error ?? 'Gagal bayar')
      return
    }
    toast.success('Pembayaran tersimpan')
    setPayOpen(false)
    load()
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hutang / Kasbon</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catatan hutang pelanggan + pelunasan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Hutang Outstanding"
          value={formatRupiah(summary.outstanding)}
          Icon={ScrollText}
          tone="destructive"
        />
        <StatCard
          label="Customer Berhutang"
          value={String(summary.customersCount)}
          Icon={Users}
        />
        <StatCard
          label="Hutang Bulan Ini"
          value={formatRupiah(summary.monthlyCreated)}
          Icon={TrendingUp}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            load()
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pelanggan / HP…"
            className="pl-9"
          />
        </form>
        <Select value={status} onValueChange={(v) => setStatus((v as typeof status) ?? 'open')}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <ScrollText className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Belum ada hutang</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Hutang tercatat otomatis saat pelanggan pilih metode bayar Hutang di kasir.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-5 py-2.5 font-semibold">Pelanggan</th>
                  <th className="px-5 py-2.5 font-semibold">Asal</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Dibayar</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Sisa</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((d) => {
                  const sisa = d.amount - d.paidAmount
                  return (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-2.5">
                        <Link href={`/pelanggan/${d.customerId}`} className="font-semibold hover:underline">
                          {d.customerName}
                        </Link>
                        {d.customerPhone && (
                          <div className="text-xs text-muted-foreground">{d.customerPhone}</div>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs">
                        {d.transactionId ? (
                          <Link href={`/transaksi`} className="hover:underline">TRX</Link>
                        ) : (
                          'Manual'
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(d.amount)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatRupiah(d.paidAmount)}
                      </td>
                      <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${sisa > 0 ? 'text-destructive' : 'text-success'}`}>
                        {formatRupiah(sisa)}
                      </td>
                      <td className="px-5 py-2.5">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {d.status !== 'paid' && (
                          <Button size="sm" variant="outline" onClick={() => openPay(d)}>
                            Bayar
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bayar Hutang</DialogTitle>
            {payTarget && (
              <DialogDescription>
                {payTarget.customerName} • Sisa{' '}
                <strong>{formatRupiah(payTarget.amount - payTarget.paidAmount)}</strong>
              </DialogDescription>
            )}
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-amount">Jumlah Bayar</Label>
                <CurrencyInput
                  id="p-amount"
                  value={payAmount}
                  onValueChange={(n) => setPayAmount(n)}
                />
                <button
                  type="button"
                  onClick={() => setPayAmount(payTarget.amount - payTarget.paidAmount)}
                  className="text-xs text-primary hover:underline"
                >
                  Bayar Lunas ({formatRupiah(payTarget.amount - payTarget.paidAmount)})
                </button>
              </div>

              <div className="space-y-1.5">
                <Label>Metode Bayar</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'qris', 'transfer'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`rounded-lg border p-2.5 text-sm font-semibold uppercase transition-all ${
                        payMethod === m
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-notes">Catatan</Label>
                <Textarea
                  id="p-notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  placeholder="Opsional"
                />
              </div>

              <Button
                onClick={submitPay}
                disabled={paying}
                className="w-full h-11 font-semibold gap-2"
              >
                {paying && <Loader2 className="size-4 animate-spin" />}
                Bayar {formatRupiah(payAmount)}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string
  value: string
  Icon: React.ComponentType<{ className?: string }>
  tone?: 'destructive'
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </div>
        <div
          className={`size-8 rounded-lg flex items-center justify-center ${
            tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${tone === 'destructive' ? 'text-destructive' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'open' | 'partial' | 'paid' }) {
  const styles =
    status === 'paid'
      ? 'bg-success/10 text-success'
      : status === 'partial'
      ? 'bg-warning/10 text-warning'
      : 'bg-destructive/10 text-destructive'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${styles}`}>{status}</span>
  )
}
