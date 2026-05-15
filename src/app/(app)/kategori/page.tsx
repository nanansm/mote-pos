'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Category = {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export default function CategoriesPage() {
  const [list, setList] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', sortOrder: 0, isActive: true })

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/categories')
    const j = await r.json()
    setList(j.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', sortOrder: 0, isActive: true })
    setOpen(true)
  }
  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, sortOrder: c.sortOrder, isActive: c.isActive })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Nama wajib diisi')
    const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      toast.error('Gagal menyimpan')
      return
    }
    toast.success(editing ? 'Kategori diperbarui' : 'Kategori dibuat')
    setOpen(false)
    load()
  }

  const remove = async (c: Category) => {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return
    const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Gagal menghapus')
    toast.success('Kategori dihapus')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Kategori</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Kelompokkan produkmu agar gampang ditemukan di kasir.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Tambah Kategori
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit Kategori' : 'Tambah Kategori'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sort">Urutan</Label>
                <Input
                  id="sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Aktif</Label>
                <Switch
                  id="active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
              <Button onClick={submit} className="w-full">
                {editing ? 'Simpan Perubahan' : 'Tambah'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white">
        {loading ? (
          <div className="p-6 text-sm text-neutral-500">Memuat…</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            Belum ada kategori. Tambah kategori pertamamu.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <div className="font-medium text-neutral-900">{c.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Urutan {c.sortOrder} • {c.isActive ? 'Aktif' : 'Nonaktif'}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(c)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
