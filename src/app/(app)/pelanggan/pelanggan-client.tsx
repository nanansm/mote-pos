'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Users,
  Phone,
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

type Customer = {
  id: string
  name: string
  phone: string | null
  notes: string | null
  totalPurchases: number
  totalDebt: number
  lastTrxAt: string | null
}

const empty = { name: '', phone: '', notes: '' }

export function PelangganClient() {
  const [list, setList] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ ...empty })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/customers?${params}`)
    const j = await res.json()
    setList(j.data ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...empty })
    setOpen(true)
  }
  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone ?? '', notes: c.notes ?? '' })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Nama wajib diisi')
    setSaving(true)
    const url = editing ? `/api/customers/${editing.id}` : '/api/customers'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        notes: form.notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal simpan')
      return
    }
    toast.success(editing ? 'Pelanggan diperbarui' : 'Pelanggan ditambah')
    setOpen(false)
    load()
  }

  const remove = async (c: Customer) => {
    if (!confirm(`Hapus pelanggan "${c.name}"?`)) return
    const res = await fetch(`/api/customers/${c.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal hapus')
      return
    }
    toast.success('Pelanggan dihapus')
    load()
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pelanggan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Database pelanggan toko + riwayat belanja & hutang.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 font-semibold">
          <Plus className="size-4" /> Tambah Pelanggan
        </Button>
      </div>

      <form
        className="relative max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau nomor HP…"
          className="pl-9"
        />
      </form>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Belum ada pelanggan</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Pelanggan akan otomatis tersimpan saat kamu input nama di transaksi, atau tambah manual di sini.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Nama</th>
                    <th className="px-5 py-2.5 font-semibold">HP</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Total Belanja</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Hutang</th>
                    <th className="px-5 py-2.5 font-semibold">Terakhir Trx</th>
                    <th className="px-5 py-2.5 font-semibold w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-5 py-2.5 font-semibold">
                        <Link href={`/pelanggan/${c.id}`} className="hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground">{c.phone ?? '—'}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        {formatRupiah(c.totalPurchases)}
                      </td>
                      <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${c.totalDebt > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {c.totalDebt > 0 ? formatRupiah(c.totalDebt) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {c.lastTrxAt
                          ? new Date(c.lastTrxAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)} aria-label="Edit">
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(c)}
                          aria-label="Hapus"
                          disabled={c.totalPurchases > 0}
                        >
                          <Trash2 className={`size-4 ${c.totalPurchases > 0 ? 'text-muted-foreground/40' : 'text-destructive'}`} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-border">
              {list.map((c) => (
                <li key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/pelanggan/${c.id}`} className="font-semibold hover:underline block truncate">
                        {c.name}
                      </Link>
                      {c.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="size-3" />
                          {c.phone}
                        </div>
                      )}
                      <div className="mt-2 flex gap-4 text-xs">
                        <span>
                          <span className="text-muted-foreground">Belanja:</span>{' '}
                          <strong>{formatRupiah(c.totalPurchases)}</strong>
                        </span>
                        {c.totalDebt > 0 && (
                          <span className="text-destructive font-semibold">
                            Hutang: {formatRupiah(c.totalDebt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} aria-label="Edit">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(c)}
                        aria-label="Hapus"
                        disabled={c.totalPurchases > 0}
                      >
                        <Trash2 className={`size-4 ${c.totalPurchases > 0 ? 'text-muted-foreground/40' : 'text-destructive'}`} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nama</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama pelanggan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">HP / WhatsApp</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0812xxxxxxx"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-notes">Catatan</Label>
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan opsional"
                rows={2}
              />
            </div>
            <Button onClick={submit} disabled={saving} className="w-full h-11 font-semibold gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
