'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Phone,
  Loader2,
  Receipt,
  Wallet,
  Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatRupiah } from '@/lib/format'

type Detail = {
  customer: {
    id: string
    name: string
    phone: string | null
    notes: string | null
    totalPurchases: number
    totalDebt: number
  }
  transactions: {
    id: string
    trxNumber: string
    trxDate: string
    total: number
    status: string
    paymentMethod: string
  }[]
  debts: {
    id: string
    amount: number
    paidAmount: number
    status: string
    notes: string | null
    createdAt: string
  }[]
}

export function PelangganDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'transaksi' | 'hutang'>('transaksi')
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/customers/${id}`)
    if (!res.ok) {
      setLoading(false)
      toast.error('Pelanggan tidak ditemukan')
      return
    }
    const j: Detail = await res.json()
    setData(j)
    setForm({
      name: j.customer.name,
      phone: j.customer.phone ?? '',
      notes: j.customer.notes ?? '',
    })
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    setSaving(true)
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        notes: form.notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error('Gagal simpan')
      return
    }
    toast.success('Tersimpan')
    setEditOpen(false)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    )
  }
  if (!data) {
    return <div className="text-muted-foreground">Pelanggan tidak ditemukan.</div>
  }

  const c = data.customer
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/pelanggan"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{c.name}</h1>
              {c.phone && (
                <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="size-3.5" />
                  <a href={`https://wa.me/${c.phone.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="hover:underline">
                    {c.phone}
                  </a>
                </div>
              )}
              {c.notes && (
                <p className="text-sm text-muted-foreground mt-2 max-w-prose">{c.notes}</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Edit2 className="size-3.5" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <Receipt className="size-3.5" /> Total Belanja
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {formatRupiah(c.totalPurchases)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <Wallet className="size-3.5" /> Hutang Outstanding
          </div>
          <div className={`mt-2 text-2xl font-bold tabular-nums ${c.totalDebt > 0 ? 'text-destructive' : ''}`}>
            {formatRupiah(c.totalDebt)}
          </div>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('transaksi')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'transaksi' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
          }`}
        >
          Riwayat Transaksi ({data.transactions.length})
        </button>
        <button
          onClick={() => setTab('hutang')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'hutang' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
          }`}
        >
          Hutang ({data.debts.filter((d) => d.status !== 'paid').length})
        </button>
      </nav>

      {tab === 'transaksi' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {data.transactions.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Belum ada transaksi untuk pelanggan ini.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">No.</th>
                  <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-5 py-2.5 font-semibold">Bayar</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-5 py-2.5 font-semibold tabular-nums">{t.trxNumber}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {new Date(t.trxDate).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-2.5 uppercase text-xs font-semibold text-muted-foreground">
                      {t.paymentMethod}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-muted">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold">
                      {formatRupiah(t.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'hutang' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {data.debts.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Belum ada hutang untuk pelanggan ini.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Hutang</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Sudah Bayar</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Sisa</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.debts.map((d) => {
                  const sisa = d.amount - d.paidAmount
                  return (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(d.amount)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatRupiah(d.paidAmount)}
                      </td>
                      <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${sisa > 0 ? 'text-destructive' : 'text-success'}`}>
                        {formatRupiah(sisa)}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            d.status === 'paid'
                              ? 'bg-success/10 text-success'
                              : d.status === 'partial'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {d.status !== 'paid' && (
                          <Link href={`/hutang?debt=${d.id}`}>
                            <Button size="sm" variant="outline">Bayar</Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Nama</Label>
              <Input
                id="e-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-phone">HP</Label>
              <Input
                id="e-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-notes">Catatan</Label>
              <Textarea
                id="e-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <Button onClick={submit} disabled={saving} className="w-full h-11 font-semibold gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
