'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Loader2,
  Wallet,
  Users,
  Calendar,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatRupiah } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/payment-methods/labels'

type DepositRow = {
  id: string
  amount: number
  balance: number
  paymentMethod: string
  status: string
  notes: string | null
  createdAt: string
  customerId: string
  customerName: string
  customerPhone: string | null
}

type Stats = {
  totalBalance: number
  customerCount: number
  monthAmount: number
}

type CustomerHit = { id: string; name: string; phone: string | null }

export function TitipanUangClient() {
  const [data, setData] = useState<DepositRow[]>([])
  const [stats, setStats] = useState<Stats>({
    totalBalance: 0,
    customerCount: 0,
    monthAmount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    amount: 0,
    paymentMethod: 'cash',
    notes: '',
  })
  const [customerHits, setCustomerHits] = useState<CustomerHit[]>([])
  const [saving, setSaving] = useState(false)
  const [createMode, setCreateMode] = useState(false)
  const [newCust, setNewCust] = useState({ name: '', phone: '' })
  const [creatingCust, setCreatingCust] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const url = new URL('/api/deposits', window.location.origin)
    if (query) url.searchParams.set('q', query)
    const res = await fetch(url.toString())
    if (res.ok) {
      const j = await res.json()
      setData(j.data ?? [])
      setStats(j.stats ?? { totalBalance: 0, customerCount: 0, monthAmount: 0 })
    }
    setLoading(false)
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  const search = async (q: string) => {
    if (!q.trim()) {
      setCustomerHits([])
      return
    }
    const res = await fetch(`/api/customers/quick-search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const j = await res.json()
      setCustomerHits(j.data ?? [])
    }
  }

  const submit = async () => {
    if (!form.customerId) return toast.error('Pilih pelanggan')
    if (form.amount <= 0) return toast.error('Jumlah harus lebih dari 0')
    setSaving(true)
    const res = await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customerId: form.customerId,
        amount: Math.round(form.amount),
        paymentMethod: form.paymentMethod,
        notes: form.notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal simpan')
    }
    toast.success('Titipan tersimpan')
    setAddOpen(false)
    setForm({ customerId: '', customerName: '', amount: 0, paymentMethod: 'cash', notes: '' })
    setCreateMode(false)
    setNewCust({ name: '', phone: '' })
    load()
  }

  const createCustomer = async () => {
    const name = newCust.name.trim()
    const phone = newCust.phone.trim()
    if (!name) return toast.error('Nama wajib diisi')
    if (!phone) return toast.error('No HP wajib diisi')
    setCreatingCust(true)
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })
    setCreatingCust(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal buat pelanggan')
    }
    const j = await res.json()
    setForm({ ...form, customerId: j.id, customerName: j.name })
    setCustomerHits([])
    setCreateMode(false)
    setNewCust({ name: '', phone: '' })
    toast.success('Pelanggan baru ditambahkan')
  }

  const filtered = statusFilter === 'all' ? data : data.filter((d) => d.status === statusFilter)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Titipan Uang</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saldo titipan customer untuk dipakai di transaksi nanti.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2 font-semibold transition-colors hover:bg-brand-500/90"
        >
          <Plus className="size-4" /> Tambah Titipan
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Saldo Titipan" Icon={Wallet} value={formatRupiah(stats.totalBalance)} />
        <StatCard label="Customer Bertitipan" Icon={Users} value={String(stats.customerCount)} />
        <StatCard label="Titipan Bulan Ini" Icon={Calendar} value={formatRupiah(stats.monthAmount)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari customer (nama atau HP)…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="depleted">Habis</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Belum ada titipan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-5 py-2.5 font-semibold">Customer</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Jumlah Titip</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Sisa</th>
                  <th className="px-5 py-2.5 font-semibold">Metode</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/pelanggan/${d.customerId}`}
                        className="font-semibold hover:underline"
                      >
                        {d.customerName}
                      </Link>
                      {d.customerPhone && (
                        <div className="text-xs text-muted-foreground">{d.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatRupiah(d.amount)}
                    </td>
                    <td
                      className={`px-5 py-2.5 text-right tabular-nums font-semibold ${d.balance > 0 ? 'text-success' : 'text-muted-foreground'}`}
                    >
                      {formatRupiah(d.balance)}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground text-xs">
                      {getPaymentMethodLabel(d.paymentMethod)}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          d.status === 'active'
                            ? 'bg-success/10 text-success'
                            : d.status === 'refunded'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/titipan-uang/${d.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-brand-500/10 hover:border-brand-500/30"
                        >
                          Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o)
          if (!o) {
            setCreateMode(false)
            setNewCust({ name: '', phone: '' })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Titipan</DialogTitle>
            <DialogDescription>Catat saldo titipan customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!createMode ? (
              <div className="space-y-1.5 relative">
                <Label htmlFor="cust">Pelanggan</Label>
                <Input
                  id="cust"
                  value={form.customerName}
                  onChange={(e) => {
                    setForm({ ...form, customerName: e.target.value, customerId: '' })
                    search(e.target.value)
                  }}
                  placeholder="Ketik nama / HP…"
                />
                {customerHits.length > 0 && !form.customerId && (
                  <ul className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {customerHits.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setForm({
                              ...form,
                              customerId: h.id,
                              customerName: h.name,
                            })
                            setCustomerHits([])
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        >
                          <div className="font-semibold">{h.name}</div>
                          {h.phone && (
                            <div className="text-xs text-muted-foreground">{h.phone}</div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {form.customerId ? (
                  <p className="text-xs text-success font-semibold">
                    ✓ Pelanggan dipilih
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const typed = form.customerName.trim()
                      const looksLikePhone = /^[+\d][\d\s-]*$/.test(typed)
                      setNewCust({
                        name: looksLikePhone ? '' : typed,
                        phone: looksLikePhone ? typed : '',
                      })
                      setCreateMode(true)
                      setCustomerHits([])
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-500/80 mt-1"
                  >
                    <UserPlus className="size-3.5" /> Buat pelanggan baru
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-dashed border-border p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Pelanggan Baru</p>
                  <button
                    type="button"
                    onClick={() => setCreateMode(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Batal
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-name">Nama</Label>
                  <Input
                    id="nc-name"
                    value={newCust.name}
                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                    placeholder="Nama pelanggan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-phone">
                    No HP / WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nc-phone"
                    type="tel"
                    inputMode="tel"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <Button
                  type="button"
                  onClick={createCustomer}
                  disabled={creatingCust}
                  size="sm"
                  className="w-full gap-2 font-semibold"
                >
                  {creatingCust && <Loader2 className="size-4 animate-spin" />}
                  Simpan Pelanggan
                </Button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="amt">Jumlah</Label>
              <CurrencyInput
                id="amt"
                value={form.amount}
                onValueChange={(n) => setForm({ ...form, amount: n })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Metode Bayar</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) => setForm({ ...form, paymentMethod: v ?? 'cash' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dnotes">Catatan</Label>
              <Textarea
                id="dnotes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button
                onClick={submit}
                disabled={saving}
                className="flex-1 font-semibold gap-2 transition-colors hover:bg-brand-500/90"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Simpan
              </Button>
            </div>
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
}: {
  label: string
  value: string
  Icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-brand-500/30 hover:scale-[1.01]">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
