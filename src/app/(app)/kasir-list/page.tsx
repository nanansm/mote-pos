'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, KeyRound, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Cashier = {
  id: string
  name: string
  role: 'cashier' | 'manager'
  isActive: boolean
}

export default function CashiersPage() {
  const [list, setList] = useState<Cashier[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cashier | null>(null)
  const [form, setForm] = useState({
    name: '',
    role: 'cashier' as 'cashier' | 'manager',
    isActive: true,
    pin: '',
    confirmPin: '',
  })

  const [pinOpen, setPinOpen] = useState(false)
  const [pinTarget, setPinTarget] = useState<Cashier | null>(null)
  const [pinForm, setPinForm] = useState({ pin: '', confirm: '' })

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/cashiers')
    const j = await r.json()
    setList(j.data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', role: 'cashier', isActive: true, pin: '', confirmPin: '' })
    setOpen(true)
  }
  const openEdit = (c: Cashier) => {
    setEditing(c)
    setForm({ name: c.name, role: c.role, isActive: c.isActive, pin: '', confirmPin: '' })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Nama wajib diisi')
    if (!editing) {
      if (!/^\d{6}$/.test(form.pin)) return toast.error('PIN harus 6 digit angka')
      if (form.pin !== form.confirmPin) return toast.error('Konfirmasi PIN tidak sama')
      const res = await fetch('/api/cashiers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role,
          isActive: form.isActive,
          pin: form.pin,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        return toast.error(j.error ?? 'Gagal menyimpan')
      }
      toast.success('Kasir ditambahkan')
    } else {
      const res = await fetch(`/api/cashiers/${editing.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) return toast.error('Gagal menyimpan')
      toast.success('Kasir diperbarui')
    }
    setOpen(false)
    load()
  }

  const remove = async (c: Cashier) => {
    if (!confirm(`Hapus kasir "${c.name}"?`)) return
    const res = await fetch(`/api/cashiers/${c.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Tidak bisa dihapus (mungkin sudah punya transaksi).')
    toast.success('Kasir dihapus')
    load()
  }

  const openResetPin = (c: Cashier) => {
    setPinTarget(c)
    setPinForm({ pin: '', confirm: '' })
    setPinOpen(true)
  }
  const submitResetPin = async () => {
    if (!pinTarget) return
    if (!/^\d{6}$/.test(pinForm.pin)) return toast.error('PIN harus 6 digit')
    if (pinForm.pin !== pinForm.confirm) return toast.error('Konfirmasi tidak sama')
    const res = await fetch(`/api/cashiers/${pinTarget.id}/reset-pin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: pinForm.pin }),
    })
    if (!res.ok) return toast.error('Gagal reset PIN')
    toast.success('PIN berhasil diperbarui')
    setPinOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Kasir & Shift
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Kelola karyawan kasir & PIN approval.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Tambah Kasir
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500">Memuat…</div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
          Belum ada kasir.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((c) => (
            <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-neutral-900">{c.name}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {c.role === 'manager' ? 'Manager' : 'Cashier'} •{' '}
                    {c.isActive ? 'Aktif' : 'Nonaktif'}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                  <Pencil className="size-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => openResetPin(c)}>
                  <KeyRound className="size-3.5 mr-1" /> Reset PIN
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(c)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kasir' : 'Tambah Kasir'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm({ ...form, role: v as 'cashier' | 'manager' })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editing && (
              <>
                <div>
                  <Label>PIN 6-digit</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pin}
                    onChange={(e) =>
                      setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })
                    }
                    className="mt-1 text-center text-2xl tracking-[0.5em]"
                    placeholder="••••••"
                  />
                </div>
                <div>
                  <Label>Konfirmasi PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.confirmPin}
                    onChange={(e) =>
                      setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, '') })
                    }
                    className="mt-1 text-center text-2xl tracking-[0.5em]"
                    placeholder="••••••"
                  />
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
            <Button onClick={submit} className="w-full">
              {editing ? 'Simpan Perubahan' : 'Tambah Kasir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset PIN — {pinTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>PIN baru</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinForm.pin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '') })
                }
                className="mt-1 text-center text-2xl tracking-[0.5em]"
                placeholder="••••••"
              />
            </div>
            <div>
              <Label>Konfirmasi PIN baru</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinForm.confirm}
                onChange={(e) =>
                  setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, '') })
                }
                className="mt-1 text-center text-2xl tracking-[0.5em]"
                placeholder="••••••"
              />
            </div>
            <Button onClick={submitResetPin} className="w-full">
              Simpan PIN Baru
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
