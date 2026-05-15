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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatRupiah } from '@/lib/format'

type ModOption = {
  id: string
  groupId: string
  name: string
  priceAdd: string
  sortOrder: number
  isActive: boolean
}
type ModGroup = {
  id: string
  name: string
  type: 'single' | 'multiple'
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: ModOption[]
}

type GroupForm = {
  name: string
  type: 'single' | 'multiple'
  isRequired: boolean
  minSelect: number
  maxSelect: number
}
const emptyGroup: GroupForm = {
  name: '',
  type: 'single',
  isRequired: false,
  minSelect: 0,
  maxSelect: 1,
}

export default function ModifierPage() {
  const [list, setList] = useState<ModGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [groupOpen, setGroupOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ModGroup | null>(null)
  const [groupForm, setGroupForm] = useState<GroupForm>({ ...emptyGroup })

  const [optOpen, setOptOpen] = useState(false)
  const [optGroupId, setOptGroupId] = useState<string | null>(null)
  const [editingOpt, setEditingOpt] = useState<ModOption | null>(null)
  const [optForm, setOptForm] = useState({ name: '', priceAdd: 0, sortOrder: 0, isActive: true })

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/modifier-groups')
    const j = await r.json()
    setList(j.data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const openCreateGroup = () => {
    setEditingGroup(null)
    setGroupForm({ ...emptyGroup })
    setGroupOpen(true)
  }
  const openEditGroup = (g: ModGroup) => {
    setEditingGroup(g)
    setGroupForm({
      name: g.name,
      type: g.type,
      isRequired: g.isRequired,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
    })
    setGroupOpen(true)
  }
  const submitGroup = async () => {
    if (!groupForm.name.trim()) return toast.error('Nama wajib diisi')
    const url = editingGroup
      ? `/api/modifier-groups/${editingGroup.id}`
      : '/api/modifier-groups'
    const method = editingGroup ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(groupForm),
    })
    if (!res.ok) return toast.error('Gagal menyimpan')
    toast.success(editingGroup ? 'Group diperbarui' : 'Group dibuat')
    setGroupOpen(false)
    load()
  }
  const removeGroup = async (g: ModGroup) => {
    if (!confirm(`Hapus group "${g.name}" beserta semua opsinya?`)) return
    const res = await fetch(`/api/modifier-groups/${g.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Gagal menghapus')
    toast.success('Group dihapus')
    load()
  }

  const openCreateOpt = (groupId: string) => {
    setEditingOpt(null)
    setOptGroupId(groupId)
    setOptForm({ name: '', priceAdd: 0, sortOrder: 0, isActive: true })
    setOptOpen(true)
  }
  const openEditOpt = (o: ModOption) => {
    setEditingOpt(o)
    setOptGroupId(o.groupId)
    setOptForm({
      name: o.name,
      priceAdd: Number(o.priceAdd),
      sortOrder: o.sortOrder,
      isActive: o.isActive,
    })
    setOptOpen(true)
  }
  const submitOpt = async () => {
    if (!optForm.name.trim()) return toast.error('Nama opsi wajib diisi')
    if (editingOpt) {
      const res = await fetch(`/api/modifier-options/${editingOpt.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(optForm),
      })
      if (!res.ok) return toast.error('Gagal menyimpan')
    } else {
      const res = await fetch('/api/modifier-options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...optForm, groupId: optGroupId }),
      })
      if (!res.ok) return toast.error('Gagal menyimpan')
    }
    toast.success(editingOpt ? 'Opsi diperbarui' : 'Opsi dibuat')
    setOptOpen(false)
    load()
  }
  const removeOpt = async (o: ModOption) => {
    if (!confirm(`Hapus opsi "${o.name}"?`)) return
    const res = await fetch(`/api/modifier-options/${o.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Gagal menghapus')
    toast.success('Opsi dihapus')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Modifier</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Buat varian produk (level pedas, topping, dll).
          </p>
        </div>
        <Button onClick={openCreateGroup} className="gap-2">
          <Plus className="size-4" /> Tambah Group
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500">Memuat…</div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
          Belum ada modifier group.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((g) => (
            <div key={g.id} className="rounded-xl border border-neutral-200 bg-white">
              <div className="flex items-start justify-between p-5 border-b border-neutral-200">
                <div>
                  <div className="font-semibold text-neutral-900">{g.name}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {g.type === 'single' ? 'Pilih satu' : 'Pilih banyak'}
                    {g.isRequired ? ' • Wajib' : ' • Opsional'}
                    {' • Min ' + g.minSelect + ', Max ' + g.maxSelect}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditGroup(g)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeGroup(g)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <ul className="divide-y divide-neutral-200">
                {g.options.length === 0 ? (
                  <li className="px-5 py-4 text-sm text-neutral-500">
                    Belum ada opsi di group ini.
                  </li>
                ) : (
                  g.options.map((o) => (
                    <li key={o.id} className="flex items-center px-5 py-3 gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{o.name}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {Number(o.priceAdd) > 0
                            ? `+ ${formatRupiah(o.priceAdd)}`
                            : 'Gratis'}
                          {o.isActive ? '' : ' • Nonaktif'}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openEditOpt(o)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeOpt(o)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))
                )}
              </ul>
              <div className="p-3 border-t border-neutral-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => openCreateOpt(g.id)}
                >
                  <Plus className="size-4" /> Tambah Opsi
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Modifier Group' : 'Tambah Modifier Group'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama group</Label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="cth. Level Pedas"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipe</Label>
              <Select
                value={groupForm.type}
                onValueChange={(v) =>
                  setGroupForm({
                    ...groupForm,
                    type: ((v ?? 'single') as 'single' | 'multiple'),
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Pilih satu</SelectItem>
                  <SelectItem value="multiple">Pilih banyak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Wajib pilih?</Label>
              <Switch
                checked={groupForm.isRequired}
                onCheckedChange={(v) => setGroupForm({ ...groupForm, isRequired: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min pilih</Label>
                <Input
                  type="number"
                  value={groupForm.minSelect}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      minSelect: Number(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max pilih</Label>
                <Input
                  type="number"
                  value={groupForm.maxSelect}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      maxSelect: Number(e.target.value) || 1,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={submitGroup} className="w-full">
              {editingGroup ? 'Simpan Perubahan' : 'Tambah Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={optOpen} onOpenChange={setOptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOpt ? 'Edit Opsi' : 'Tambah Opsi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama opsi</Label>
              <Input
                value={optForm.name}
                onChange={(e) => setOptForm({ ...optForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tambahan harga</Label>
              <Input
                type="number"
                value={optForm.priceAdd}
                onChange={(e) =>
                  setOptForm({ ...optForm, priceAdd: Number(e.target.value) || 0 })
                }
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={optForm.isActive}
                onCheckedChange={(v) => setOptForm({ ...optForm, isActive: v })}
              />
            </div>
            <Button onClick={submitOpt} className="w-full">
              {editingOpt ? 'Simpan Perubahan' : 'Tambah Opsi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
