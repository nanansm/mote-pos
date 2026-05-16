'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
} from 'lucide-react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Combobox } from '@/components/ui/combobox'
import { formatRupiah } from '@/lib/format'

const DEFAULT_UNITS = [
  'pcs',
  'kg',
  'gram',
  'liter',
  'ml',
  'cup',
  'porsi',
  'box',
  'lusin',
  'dus',
]

type Product = {
  id: string
  groupId?: string | null
  variantName?: string | null
  name: string
  sku: string | null
  barcode: string | null
  priceSell: string
  priceCost: string | null
  unit: string
  stockTrack: boolean
  stockCurrent: number
  isActive: boolean
  categoryId: string | null
  categoryName: string | null
  modifierGroupIds: string[]
}

type VariantRow = {
  variantName: string
  priceSell: number
  priceCost: number
  sku: string
  barcode: string
  unit: string
  stockTrack: boolean
  stockCurrent: number
}

const emptyVariant: VariantRow = {
  variantName: '',
  priceSell: 0,
  priceCost: 0,
  sku: '',
  barcode: '',
  unit: 'pcs',
  stockTrack: false,
  stockCurrent: 0,
}
type Category = { id: string; name: string }
type ModifierGroup = { id: string; name: string }

const emptyForm = {
  name: '',
  categoryId: '',
  sku: '',
  barcode: '',
  priceSell: 0,
  priceCost: 0,
  unit: 'pcs',
  stockTrack: false,
  stockCurrent: 0,
  isActive: true,
  modifierGroupIds: [] as string[],
}

type ParsedRow = Record<string, string>

export default function ProductsPage() {
  const [list, setList] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')

  // STEP 9 — variant toggle + rows
  const [hasVariants, setHasVariants] = useState(false)
  const [variantRows, setVariantRows] = useState<VariantRow[]>([
    { ...emptyVariant },
    { ...emptyVariant },
  ])

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<ParsedRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvTotal, setCsvTotal] = useState(0)
  const [importing, setImporting] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const [p, c, m, u] = await Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/modifier-groups').then((r) => r.json()),
      fetch('/api/products/units').then((r) => r.json()),
    ])
    setList(p.data ?? [])
    setCats(c.data ?? [])
    setGroups(m.data ?? [])
    setUnitSuggestions(u.data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (filterCat !== 'all' && p.categoryId !== filterCat) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [list, filterCat, search])

  const groupSummary = useMemo(() => {
    const map = new Map<string, { count: number; min: number; max: number }>()
    for (const p of list) {
      const key = p.groupId ?? p.id
      const price = Number(p.priceSell)
      const cur = map.get(key)
      if (!cur) {
        map.set(key, { count: 1, min: price, max: price })
      } else {
        cur.count += 1
        cur.min = Math.min(cur.min, price)
        cur.max = Math.max(cur.max, price)
      }
    }
    return map
  }, [list])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setHasVariants(false)
    setVariantRows([{ ...emptyVariant }, { ...emptyVariant }])
    setOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      categoryId: p.categoryId ?? '',
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      priceSell: Number(p.priceSell),
      priceCost: p.priceCost ? Number(p.priceCost) : 0,
      unit: p.unit,
      stockTrack: p.stockTrack,
      stockCurrent: p.stockCurrent,
      isActive: p.isActive,
      modifierGroupIds: p.modifierGroupIds,
    })
    setHasVariants(false)
    setOpen(true)
  }

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Nama produk wajib diisi')
    setSaving(true)

    if (!editing && hasVariants) {
      const rows = variantRows.filter((v) => v.variantName.trim() || v.priceSell > 0)
      if (rows.length < 2) {
        setSaving(false)
        return toast.error('Minimal 2 variant atau matikan toggle Variant')
      }
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId || null,
        variants: rows.map((v) => ({
          variantName: v.variantName.trim() || null,
          sku: v.sku.trim() || null,
          barcode: v.barcode.trim() || null,
          priceSell: Number(v.priceSell) || 0,
          priceCost: v.priceCost > 0 ? Number(v.priceCost) : null,
          unit: v.unit || 'pcs',
          stockTrack: v.stockTrack,
          stockCurrent: v.stockTrack ? Number(v.stockCurrent) || 0 : 0,
          isActive: true,
        })),
      }
      const res = await fetch('/api/product-groups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setSaving(false)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j.error ?? 'Gagal menyimpan')
        return
      }
      toast.success(`Produk + ${rows.length} variant dibuat`)
      setOpen(false)
      load()
      return
    }

    if (form.priceSell < 0) {
      setSaving(false)
      return toast.error('Harga jual tidak valid')
    }
    const payload = {
      name: form.name,
      categoryId: form.categoryId || null,
      sku: form.sku || null,
      barcode: form.barcode || null,
      priceSell: Number(form.priceSell),
      priceCost: form.priceCost ? Number(form.priceCost) : null,
      unit: form.unit,
      stockTrack: form.stockTrack,
      stockCurrent: form.stockCurrent,
      isActive: form.isActive,
      modifierGroupIds: form.modifierGroupIds,
    }
    const url = editing ? `/api/products/${editing.id}` : '/api/products'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal menyimpan')
      return
    }
    toast.success(editing ? 'Produk diperbarui' : 'Produk dibuat')
    setOpen(false)
    load()
  }

  const remove = async (p: Product) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return
    const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Gagal menghapus')
    toast.success('Produk dihapus')
    load()
  }

  const handleCsvFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File terlalu besar (max 5MB)')
      return
    }
    setCsvFile(file)
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        const rows = (results.data ?? []).filter((r) => Object.values(r).some((v) => v))
        setCsvPreview(rows.slice(0, 10))
        setCsvTotal(rows.length)
        setCsvHeaders(results.meta.fields ?? [])
      },
      error: () => toast.error('Gagal parse CSV'),
    })
  }

  const onCsvInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleCsvFile(f)
  }
  const onCsvDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleCsvFile(f)
  }
  const resetCsv = () => {
    setCsvFile(null)
    setCsvPreview([])
    setCsvHeaders([])
    setCsvTotal(0)
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  const submitCsv = async () => {
    if (!csvFile) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', csvFile)
    const res = await fetch('/api/products/import-csv', {
      method: 'POST',
      body: fd,
    })
    setImporting(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(j.error ?? 'Gagal import')
      return
    }
    toast.success(
      `Import selesai: ${j.groupsCreated ?? 0} produk induk, ${j.variantsCreated ?? j.success ?? 0} variant${j.failed ? `, ${j.failed} gagal` : ''}`,
    )
    if (j.sheetsSync) {
      if (j.sheetsSync.ok) {
        toast.success('Sheets backup ter-update otomatis ✓', { duration: 4000 })
      } else {
        toast.error(`Sheets backup gagal: ${j.sheetsSync.error ?? 'unknown'}`, { duration: 6000 })
      }
    }
    if (j.errors?.length) {
      console.warn('Import errors:', j.errors)
    }
    setCsvOpen(false)
    resetCsv()
    load()
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Produk</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola katalog produk yang dijual di kasir.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCsvOpen(true)}
            className="gap-2"
          >
            <Upload className="size-4" /> Import CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 font-semibold">
            <Plus className="size-4" /> Tambah Produk
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk…"
            className="pl-9"
          />
        </div>
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v ?? 'all')}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {cats.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileSpreadsheet className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {list.length === 0 ? 'Belum ada produk' : 'Tidak ada produk yang cocok'}
            </p>
            {list.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Tambah produk pertamamu atau import via CSV
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nama</th>
                    <th className="px-5 py-3 font-semibold">Kategori</th>
                    <th className="px-5 py-3 font-semibold text-right">Harga</th>
                    <th className="px-5 py-3 font-semibold text-right">Stok</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => {
                    const key = p.groupId ?? p.id
                    const sum = groupSummary.get(key)
                    const isMulti = (sum?.count ?? 1) > 1
                    return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <span>
                            {p.name}
                            {p.variantName && (
                              <span className="text-muted-foreground"> · {p.variantName}</span>
                            )}
                          </span>
                          {isMulti && (
                            <span className="text-[10px] uppercase tracking-wider rounded bg-brand-500/10 text-brand-700 px-1.5 py-0.5 font-semibold">
                              {sum!.count} variant
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {p.categoryName ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {isMulti && sum!.min !== sum!.max
                          ? `${formatRupiah(sum!.min)} – ${formatRupiah(sum!.max)}`
                          : formatRupiah(Number(p.priceSell))}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                        {p.stockTrack ? p.stockCurrent : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            p.isActive
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label="Edit" className="hover:bg-brand-500/10 hover:text-brand-700">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(p)} aria-label="Hapus" className="hover:bg-destructive/10">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-border">
              {filtered.map((p) => (
                <li key={p.id} className="p-4 flex gap-3 items-start">
                  <div className="flex-1">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.categoryName ?? 'Tanpa kategori'}
                    </div>
                    <div className="mt-2 text-sm font-bold tabular-nums">
                      {formatRupiah(Number(p.priceSell))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p)} aria-label="Hapus">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Tambah / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nama produk</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Semen Tiga Roda"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select
                value={form.categoryId || 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, categoryId: !v || v === 'none' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa kategori</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editing && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Punya banyak variant?</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      cth. ukuran 50kg / 40kg, atau warna merah/biru
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHasVariants(false)}
                      className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
                        !hasVariants ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      Tidak
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasVariants(true)}
                      className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
                        hasVariants ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      Ya
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!editing && hasVariants && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Variant
                </div>
                {variantRows.map((v, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Variant {i + 1}</div>
                      {variantRows.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setVariantRows(variantRows.filter((_, j) => j !== i))}
                          className="text-xs text-destructive hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Nama Variant</Label>
                        <Input
                          value={v.variantName}
                          onChange={(e) =>
                            setVariantRows(
                              variantRows.map((x, j) =>
                                j === i ? { ...x, variantName: e.target.value } : x,
                              ),
                            )
                          }
                          placeholder="cth. 50kg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Harga Jual</Label>
                        <CurrencyInput
                          value={v.priceSell}
                          onValueChange={(n) =>
                            setVariantRows(
                              variantRows.map((x, j) => (j === i ? { ...x, priceSell: n } : x)),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Harga Modal</Label>
                        <CurrencyInput
                          value={v.priceCost}
                          onValueChange={(n) =>
                            setVariantRows(
                              variantRows.map((x, j) => (j === i ? { ...x, priceCost: n } : x)),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">SKU</Label>
                        <Input
                          value={v.sku}
                          onChange={(e) =>
                            setVariantRows(
                              variantRows.map((x, j) =>
                                j === i ? { ...x, sku: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Barcode</Label>
                        <Input
                          value={v.barcode}
                          onChange={(e) =>
                            setVariantRows(
                              variantRows.map((x, j) =>
                                j === i ? { ...x, barcode: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Satuan</Label>
                        <Input
                          value={v.unit}
                          onChange={(e) =>
                            setVariantRows(
                              variantRows.map((x, j) =>
                                j === i ? { ...x, unit: e.target.value } : x,
                              ),
                            )
                          }
                          placeholder="pcs"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-5">
                        <Checkbox
                          checked={v.stockTrack}
                          onCheckedChange={(c) =>
                            setVariantRows(
                              variantRows.map((x, j) =>
                                j === i ? { ...x, stockTrack: c === true } : x,
                              ),
                            )
                          }
                        />
                        <Label className="text-xs">Lacak Stok</Label>
                      </div>
                      {v.stockTrack && (
                        <div className="col-span-2">
                          <Label className="text-xs">Stok awal</Label>
                          <Input
                            type="number"
                            min={0}
                            value={v.stockCurrent}
                            onChange={(e) =>
                              setVariantRows(
                                variantRows.map((x, j) =>
                                  j === i
                                    ? { ...x, stockCurrent: Number(e.target.value) || 0 }
                                    : x,
                                ),
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setVariantRows([...variantRows, { ...emptyVariant }])}
                  className="w-full rounded-lg border border-dashed border-border p-3 text-sm font-semibold text-muted-foreground hover:bg-brand-500/10 hover:border-brand-500/30 hover:text-foreground transition-colors"
                >
                  + Tambah Variant Lain
                </button>
              </div>
            )}
            {!hasVariants && (
            <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Harga jual</Label>
                <CurrencyInput
                  id="p-price"
                  value={form.priceSell}
                  onValueChange={(n) => setForm({ ...form, priceSell: n })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-cost">Harga modal (opsional)</Label>
                <CurrencyInput
                  id="p-cost"
                  value={form.priceCost}
                  onValueChange={(n) => setForm({ ...form, priceCost: n })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">SKU</Label>
                <Input
                  id="p-sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="KOPSU-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-bar">Barcode</Label>
                <Input
                  id="p-bar"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="—"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Satuan</Label>
              <Combobox
                value={form.unit}
                onChange={(v) => setForm({ ...form, unit: v || 'pcs' })}
                options={[...DEFAULT_UNITS, ...unitSuggestions]}
                placeholder="cth. pcs, Zak, Kubik, Batang…"
                allowFreeText
              />
              <p className="text-xs text-muted-foreground">
                Bisa pilih atau ketik bebas (Zak, Kubik, Batang, dll).
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Lacak stok?</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aktifkan untuk produk fisik dengan jumlah terbatas.
                </p>
              </div>
              <Switch
                checked={form.stockTrack}
                onCheckedChange={(v) => setForm({ ...form, stockTrack: v })}
              />
            </div>
            {form.stockTrack && (
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stok saat ini</Label>
                <Input
                  id="p-stock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.stockCurrent}
                  onChange={(e) =>
                    setForm({ ...form, stockCurrent: Number(e.target.value) || 0 })
                  }
                />
              </div>
            )}
            </>
            )}
            {!hasVariants && groups.length > 0 && (
              <div className="space-y-1.5">
                <Label>Modifier Group</Label>
                <div className="mt-1 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-border p-3">
                  {groups.map((g) => {
                    const checked = form.modifierGroupIds.includes(g.id)
                    return (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = v
                              ? [...form.modifierGroupIds, g.id]
                              : form.modifierGroupIds.filter((id) => id !== g.id)
                            setForm({ ...form, modifierGroupIds: next })
                          }}
                        />
                        {g.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label className="text-sm">Aktif</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
            <Button onClick={submit} disabled={saving} className="w-full h-11 font-semibold gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import dialog */}
      <Dialog
        open={csvOpen}
        onOpenChange={(o) => {
          setCsvOpen(o)
          if (!o) resetCsv()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Produk dari CSV</DialogTitle>
            <DialogDescription>
              Upload file CSV dengan kolom: nama, kategori, harga, harga_modal, sku, barcode, unit, stock
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <a
              href="/template-produk.csv"
              download
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              <Download className="size-4" /> Download template CSV
            </a>

            {!csvFile ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={onCsvDrop}
                className="block rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 cursor-pointer p-8 text-center transition-colors"
              >
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={onCsvInput}
                />
                <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Upload className="size-5" />
                </div>
                <p className="font-semibold">Tarik & drop CSV di sini</p>
                <p className="text-xs text-muted-foreground mt-1">
                  atau klik untuk pilih file (max 5MB)
                </p>
              </label>
            ) : (
              <div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="size-4 text-primary" />
                    <span className="font-semibold">{csvFile.name}</span>
                    <span className="text-muted-foreground">
                      ({csvTotal} baris)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetCsv}>
                    Ganti
                  </Button>
                </div>

                <div className="rounded-lg border border-border overflow-auto max-h-80">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                      <tr>
                        {csvHeaders.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {csvPreview.map((row, i) => (
                        <tr key={i}>
                          {csvHeaders.map((h) => (
                            <td key={h} className="px-3 py-2 whitespace-nowrap">
                              {row[h] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvTotal > 10 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Menampilkan 10 dari {csvTotal} baris.
                  </p>
                )}

                <Button
                  onClick={submitCsv}
                  disabled={importing}
                  className="w-full mt-4 h-11 font-semibold gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Mengimpor…
                    </>
                  ) : (
                    `Import ${csvTotal} Produk`
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
