'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEFAULT_PAYMENT_LABELS } from '@/lib/payment-methods/labels'

type PaymentMethod = {
  id: string
  code: string
  label: string
  type: 'cash' | 'cashless' | 'debt' | 'deposit'
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

const TYPE_LABEL: Record<PaymentMethod['type'], string> = {
  cash: 'Tunai',
  cashless: 'Non-tunai',
  debt: 'Hutang',
  deposit: 'Saldo Titipan',
}

export function PaymentMethodsClient() {
  const [rows, setRows] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; row: PaymentMethod | null }>({
    mode: 'create',
    row: null,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({
    code: '',
    label: '',
    type: 'cashless' as PaymentMethod['type'],
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/payment-methods')
    if (res.ok) {
      const j = await res.json()
      setRows(j.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditor({ mode: 'create', row: null })
    setForm({ code: '', label: '', type: 'cashless', isActive: true })
    setEditOpen(true)
  }
  const openEdit = (row: PaymentMethod) => {
    setEditor({ mode: 'edit', row })
    setForm({ code: row.code, label: row.label, type: row.type, isActive: row.isActive })
    setEditOpen(true)
  }

  const submit = async () => {
    if (!form.code.trim() || !form.label.trim()) {
      return toast.error('Kode dan label wajib diisi')
    }
    setSaving(true)
    const path =
      editor.mode === 'edit' && editor.row
        ? `/api/payment-methods/${editor.row.id}`
        : '/api/payment-methods'
    const method = editor.mode === 'edit' ? 'PUT' : 'POST'
    const res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: form.code.trim().toLowerCase(),
        label: form.label.trim(),
        type: form.type,
        isActive: form.isActive,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal simpan')
    }
    toast.success(editor.mode === 'edit' ? 'Metode diperbarui' : 'Metode ditambahkan')
    setEditOpen(false)
    load()
  }

  const remove = async (row: PaymentMethod) => {
    if (row.isDefault) return toast.error('Metode default tidak bisa dihapus')
    if (!confirm(`Hapus metode "${row.label}"?`)) return
    const res = await fetch(`/api/payment-methods/${row.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal hapus')
    }
    toast.success('Metode dihapus')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground max-w-xl">
          Atur metode pembayaran yang tampil di kasir. Default ({Object.keys(DEFAULT_PAYMENT_LABELS).join(', ')}) tidak bisa dihapus.
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 font-semibold transition-colors hover:bg-brand-500/90"
        >
          <Plus className="size-4" /> Tambah Metode
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Belum ada metode bayar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-semibold">Label</th>
                  <th className="px-4 py-2.5 font-semibold">Kode</th>
                  <th className="px-4 py-2.5 font-semibold">Tipe</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-semibold">{r.label}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.code}</td>
                    <td className="px-4 py-2.5">{TYPE_LABEL[r.type]}</td>
                    <td className="px-4 py-2.5">
                      {r.isActive ? (
                        <span className="text-success font-semibold">Aktif</span>
                      ) : (
                        <span className="text-muted-foreground">Nonaktif</span>
                      )}
                      {r.isDefault && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          default
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(r)}
                          aria-label="Edit"
                          className="hover:bg-brand-500/10 hover:text-brand-700"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(r)}
                          aria-label="Hapus"
                          disabled={r.isDefault}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editor.mode === 'edit' ? 'Edit Metode' : 'Tambah Metode'}</DialogTitle>
            <DialogDescription>
              Kode dipakai oleh sistem (unik). Label tampil ke pengguna.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pm-code">Kode</Label>
              <Input
                id="pm-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
                placeholder="cth. ovo"
                disabled={editor.mode === 'edit' && editor.row?.isDefault === true}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm-label">Label</Label>
              <Input
                id="pm-label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="cth. OVO"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as PaymentMethod['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai (cash)</SelectItem>
                  <SelectItem value="cashless">Non-tunai (cashless)</SelectItem>
                  <SelectItem value="debt">Hutang</SelectItem>
                  <SelectItem value="deposit">Saldo Titipan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="size-4 rounded border-border accent-primary"
              />
              Aktif (tampil di kasir)
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button
                onClick={submit}
                disabled={saving}
                className="flex-1 font-semibold transition-colors hover:bg-brand-500/90"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
