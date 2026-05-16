'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatRupiah } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/payment-methods/labels'

type Detail = {
  deposit: {
    id: string
    amount: number
    balance: number
    paymentMethod: string
    status: string
    notes: string | null
    createdAt: string
    customerName: string
    customerPhone: string | null
    customerId: string
  }
  usages: Array<{
    id: string
    amount: number
    balanceAfter: number
    notes: string | null
    createdAt: string
    transactionId: string | null
  }>
}

export function TitipanUangDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refundOpen, setRefundOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/deposits/${id}`)
    if (res.ok) {
      const j = await res.json()
      setData(j)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const refund = async () => {
    if (!/^\d{6}$/.test(pin)) return toast.error('PIN manager 6 digit')
    setSubmitting(true)
    const res = await fetch(`/api/deposits/${id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    setSubmitting(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(j.error ?? 'Gagal refund')
      return
    }
    toast.success(`Refund Rp ${j.refunded?.toLocaleString('id-ID') ?? ''}`)
    setRefundOpen(false)
    setPin('')
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    )
  }
  if (!data) return <div className="text-muted-foreground">Titipan tidak ditemukan.</div>

  const d = data.deposit
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/titipan-uang"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Kembali
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{d.customerName}</h1>
            {d.customerPhone && (
              <p className="text-sm text-muted-foreground">{d.customerPhone}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Jumlah Titip
                </div>
                <div className="text-2xl font-bold tabular-nums">{formatRupiah(d.amount)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Sisa
                </div>
                <div
                  className={`text-2xl font-bold tabular-nums ${d.balance > 0 ? 'text-success' : 'text-muted-foreground'}`}
                >
                  {formatRupiah(d.balance)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {getPaymentMethodLabel(d.paymentMethod)}
              </span>
              <span className="size-1 rounded-full bg-border" />
              <span className="text-muted-foreground">
                {new Date(d.createdAt).toLocaleString('id-ID')}
              </span>
              <span className="size-1 rounded-full bg-border" />
              <span
                className={`px-2 py-0.5 rounded-full font-semibold ${
                  d.status === 'active'
                    ? 'bg-success/10 text-success'
                    : d.status === 'refunded'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {d.status}
              </span>
            </div>
            {d.notes && <p className="text-sm text-muted-foreground mt-3">{d.notes}</p>}
          </div>
          {d.status === 'active' && d.balance > 0 && (
            <Button
              variant="outline"
              onClick={() => setRefundOpen(true)}
              className="gap-2 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
            >
              <Undo2 className="size-4" /> Refund Sisa
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border font-semibold">
          Riwayat Pemakaian ({data.usages.length})
        </div>
        {data.usages.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Belum ada pemakaian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Jumlah Pakai</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Sisa Setelahnya</th>
                  <th className="px-5 py-2.5 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.usages.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatRupiah(u.amount)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatRupiah(u.balanceAfter)}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{u.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Refund Sisa Deposit</DialogTitle>
            <DialogDescription>
              Akan refund <span className="font-bold">{formatRupiah(d.balance)}</span>. Masukkan PIN
              manager 6 digit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref-pin">PIN Manager</Label>
              <Input
                id="ref-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRefundOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button
                onClick={refund}
                disabled={submitting || pin.length < 6}
                className="flex-1 gap-2"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
