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
  Download,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Star,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatRupiah } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/payment-methods/labels'

type Detail = {
  customer: {
    id: string
    name: string
    phone: string | null
    notes: string | null
    totalPurchases: number
    totalDebt: number
    totalDepositBalance?: number
  }
  debts: {
    id: string
    amount: number
    paidAmount: number
    status: string
    notes: string | null
    createdAt: string
  }[]
}

type TrxRow = {
  id: string
  trxNumber: string
  trxDate: string
  total: number
  discount: number
  status: string
  paymentMethod: string
  items: {
    id: string
    productName: string
    priceUnit: number
    quantity: number
    modifiers: Array<{ name?: string; options?: Array<{ name?: string; priceAdd?: number }> }>
    modifierTotal: number
    discount: number
    subtotal: number
    notes: string | null
  }[]
  payments: { method: string; amount: number; reference: string | null }[]
}

type ProductSummary = {
  productId: string
  productName: string
  groupName: string | null
  variantName: string | null
  categoryName: string | null
  qty: number
  total: number
  frequency: number
  lastBuy: string | null
}

type SortKey = 'qty' | 'total' | 'frequency'

export function PelangganDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const [trx, setTrx] = useState<TrxRow[]>([])
  const [trxLoading, setTrxLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [products, setProducts] = useState<ProductSummary[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [sort, setSort] = useState<SortKey>('qty')

  const loadCustomer = useCallback(async () => {
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

  const loadTrx = useCallback(async () => {
    setTrxLoading(true)
    const url = new URL(`/api/customers/${id}/transactions`, window.location.origin)
    if (dateFrom) url.searchParams.set('from', dateFrom)
    if (dateTo) url.searchParams.set('to', dateTo)
    const res = await fetch(url.toString())
    if (res.ok) {
      const j = await res.json()
      setTrx(j.data ?? [])
    }
    setTrxLoading(false)
  }, [id, dateFrom, dateTo])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    const res = await fetch(`/api/customers/${id}/products-summary?sort=${sort}`)
    if (res.ok) {
      const j = await res.json()
      setProducts(j.data ?? [])
    }
    setProductsLoading(false)
  }, [id, sort])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  useEffect(() => {
    loadTrx()
  }, [loadTrx])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

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
    loadCustomer()
  }

  const toggleExpand = (tid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(tid)) next.delete(tid)
      else next.add(tid)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    )
  }
  if (!data) return <div className="text-muted-foreground">Pelanggan tidak ditemukan.</div>

  const c = data.customer
  const top10 = products.slice(0, 10)
  const topInsight = products[0]
  const productDisplay = (p: ProductSummary) =>
    p.variantName ? `${p.groupName ?? p.productName} - ${p.variantName}` : p.productName

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-2">
        <Link
          href="/pelanggan"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                  <a
                    href={`https://wa.me/${c.phone.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {c.phone}
                  </a>
                </div>
              )}
              {c.notes && <p className="text-sm text-muted-foreground mt-2 max-w-prose">{c.notes}</p>}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="gap-1.5 hover:bg-brand-500/10 hover:border-brand-500/30 transition-colors"
          >
            <Edit2 className="size-3.5" /> Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList variant="line" className="flex-wrap h-auto justify-start gap-1">
          <TabsTrigger value="profile">Profil &amp; Stat</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Transaksi</TabsTrigger>
          <TabsTrigger value="favorit">Produk Favorit</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Total Belanja"
              value={formatRupiah(c.totalPurchases)}
              Icon={Receipt}
            />
            <StatCard
              label="Hutang Outstanding"
              value={formatRupiah(c.totalDebt)}
              Icon={Wallet}
              tone={c.totalDebt > 0 ? 'destructive' : 'neutral'}
            />
            <StatCard
              label="Saldo Titipan"
              value={formatRupiah(c.totalDepositBalance ?? 0)}
              Icon={Sparkles}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border font-semibold">Hutang</div>
            {data.debts.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Belum ada hutang untuk pelanggan ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Hutang</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Sudah Bayar</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Sisa</th>
                      <th className="px-5 py-2.5 font-semibold">Status</th>
                      <th className="px-5 py-2.5 font-semibold w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.debts.map((d) => {
                      const sisa = d.amount - d.paidAmount
                      return (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-2.5 text-muted-foreground">
                            {new Date(d.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums">
                            {formatRupiah(d.amount)}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
                            {formatRupiah(d.paidAmount)}
                          </td>
                          <td
                            className={`px-5 py-2.5 text-right tabular-nums font-semibold ${
                              sisa > 0 ? 'text-destructive' : 'text-success'
                            }`}
                          >
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="hover:bg-brand-500/10 hover:border-brand-500/30"
                                >
                                  Bayar
                                </Button>
                              </Link>
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
        </TabsContent>

        <TabsContent value="riwayat">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rdate-from">Dari</Label>
                <Input
                  id="rdate-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rdate-to">Sampai</Label>
                <Input
                  id="rdate-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <Button
                onClick={loadTrx}
                variant="outline"
                className="hover:bg-brand-500/10 hover:border-brand-500/30"
              >
                Apply
              </Button>
              <a
                href={`/api/customers/${id}/transactions/export`}
                className="sm:ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-3 h-9 text-sm font-semibold hover:bg-brand-500/10 hover:border-brand-500/30 transition-colors"
              >
                <Download className="size-4" /> Export CSV
              </a>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {trxLoading ? (
                <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Memuat…
                </div>
              ) : trx.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Belum ada transaksi untuk pelanggan ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-5 py-2.5 font-semibold w-8"></th>
                        <th className="px-5 py-2.5 font-semibold">No.</th>
                        <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                        <th className="px-5 py-2.5 font-semibold">Bayar</th>
                        <th className="px-5 py-2.5 font-semibold">Status</th>
                        <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {trx.map((t) => {
                        const isOpen = expanded.has(t.id)
                        return (
                          <>
                            <tr
                              key={t.id}
                              className="hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => toggleExpand(t.id)}
                            >
                              <td className="px-5 py-2.5 text-muted-foreground">
                                {isOpen ? (
                                  <ChevronDown className="size-4" />
                                ) : (
                                  <ChevronRight className="size-4" />
                                )}
                              </td>
                              <td className="px-5 py-2.5 font-semibold tabular-nums">
                                {t.trxNumber}
                              </td>
                              <td className="px-5 py-2.5 text-muted-foreground">
                                {new Date(t.trxDate).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-5 py-2.5 text-xs font-semibold text-muted-foreground">
                                {getPaymentMethodLabel(t.paymentMethod)}
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
                            {isOpen && (
                              <tr key={`${t.id}-d`} className="bg-muted/20">
                                <td colSpan={6} className="px-5 py-3">
                                  <div className="space-y-1.5">
                                    {t.items.map((it) => {
                                      const mods = Array.isArray(it.modifiers) ? it.modifiers : []
                                      return (
                                        <div
                                          key={it.id}
                                          className="flex justify-between gap-3 text-xs"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="font-semibold">
                                              {it.productName} <span className="text-muted-foreground">×{it.quantity}</span>
                                            </div>
                                            {mods.map((m, mi) =>
                                              (m.options ?? []).map((o, oi) => (
                                                <div
                                                  key={`${mi}-${oi}`}
                                                  className="text-muted-foreground ml-2"
                                                >
                                                  + {o.name}
                                                </div>
                                              )),
                                            )}
                                            {it.notes && (
                                              <div className="text-muted-foreground italic">
                                                Catatan: {it.notes}
                                              </div>
                                            )}
                                          </div>
                                          <div className="tabular-nums shrink-0">
                                            {formatRupiah(it.subtotal)}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="favorit">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 flex items-end gap-3 flex-wrap">
              <div className="space-y-1.5">
                <Label>Urutkan</Label>
                <Select value={sort} onValueChange={(v) => setSort((v as SortKey) ?? 'qty')}>
                  <SelectTrigger className="min-w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qty">Quantity</SelectItem>
                    <SelectItem value="total">Total Rupiah</SelectItem>
                    <SelectItem value="frequency">Frekuensi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {topInsight && (
                <div className="ml-auto flex items-start gap-2 text-sm bg-brand-500/10 border border-brand-500/30 rounded-lg px-3 py-2 max-w-md">
                  <Star className="size-4 text-brand-700 shrink-0 mt-0.5" />
                  <p className="text-foreground/90">
                    <span className="font-semibold">{c.name}</span> paling sering beli{' '}
                    <span className="font-bold">{productDisplay(topInsight)}</span> ({topInsight.qty}x, {formatRupiah(topInsight.total)})
                  </p>
                </div>
              )}
            </div>

            {productsLoading ? (
              <div className="rounded-2xl border border-border bg-card p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat…
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                Belum ada riwayat produk untuk pelanggan ini.
              </div>
            ) : (
              <>
                {top10.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="text-sm font-semibold mb-2">Top 10 (by {sort})</div>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={top10.map((p) => ({
                          name: productDisplay(p),
                          value:
                            sort === 'total' ? Number(p.total) : sort === 'frequency' ? p.frequency : p.qty,
                        }))}
                        layout="vertical"
                        margin={{ left: 32, right: 24 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={180}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(v) => {
                            const n = Number(v ?? 0)
                            return sort === 'total' ? formatRupiah(n) : String(n)
                          }}
                        />
                        <Bar dataKey="value" fill="var(--brand-500, #EAB308)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr>
                          <th className="px-5 py-2.5 font-semibold w-12">#</th>
                          <th className="px-5 py-2.5 font-semibold">Produk</th>
                          <th className="px-5 py-2.5 font-semibold">Kategori</th>
                          <th className="px-5 py-2.5 font-semibold text-right">Qty</th>
                          <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                          <th className="px-5 py-2.5 font-semibold text-right">Freq</th>
                          <th className="px-5 py-2.5 font-semibold">Terakhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {products.map((p, i) => (
                          <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                            <td className="px-5 py-2.5 font-semibold">{productDisplay(p)}</td>
                            <td className="px-5 py-2.5 text-muted-foreground">
                              {p.categoryName ?? '—'}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums">{p.qty}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums">
                              {formatRupiah(p.total)}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums">{p.frequency}</td>
                            <td className="px-5 py-2.5 text-muted-foreground">
                              {p.lastBuy
                                ? new Date(p.lastBuy).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

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
            <Button
              onClick={submit}
              disabled={saving}
              className="w-full h-11 font-semibold gap-2 transition-colors hover:bg-brand-500/90"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  label,
  value,
  Icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  Icon: React.ComponentType<{ className?: string }>
  tone?: 'neutral' | 'destructive'
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-brand-500/30 hover:scale-[1.01]">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold tabular-nums ${tone === 'destructive' ? 'text-destructive' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}
