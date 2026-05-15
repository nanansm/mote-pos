'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  Receipt,
  Ban,
  Undo2,
  Printer,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatRupiah } from '@/lib/format'

type Row = {
  id: string
  trxNumber: string
  trxDate: string
  total: number
  paymentMethod: 'cash' | 'qris' | 'transfer'
  status: 'completed' | 'voided' | 'refunded'
  cashierName: string
  itemCount: number
}

type Mode = 'void' | 'refund'

const REASONS: Record<Mode, string[]> = {
  void: [
    'Kasir salah input',
    'Customer batal pesan',
    'Test transaksi',
    'Lainnya',
  ],
  refund: [
    'Produk salah / rusak',
    'Customer kembalikan barang',
    'Komplain customer',
    'Lainnya',
  ],
}

function formatJam(s: string) {
  return new Date(s).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function isoNDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function TransaksiClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'completed' | 'voided' | 'refunded'>('all')
  const [from, setFrom] = useState(isoNDaysAgo(7))
  const [to, setTo] = useState(todayISO())

  // Modal state
  const [actOpen, setActOpen] = useState(false)
  const [actMode, setActMode] = useState<Mode>('void')
  const [actTarget, setActTarget] = useState<Row | null>(null)
  const [actReason, setActReason] = useState(REASONS.void[0])
  const [actReasonNote, setActReasonNote] = useState('')
  const [actPin, setActPin] = useState('')
  const [actSubmitting, setActSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (search) params.set('search', search)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/transactions/list?${params.toString()}`)
    const j = await res.json()
    setRows(j.data ?? [])
    setLoading(false)
  }, [status, search, from, to])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to])

  const openAction = (mode: Mode, row: Row) => {
    setActMode(mode)
    setActTarget(row)
    setActReason(REASONS[mode][0])
    setActReasonNote('')
    setActPin('')
    setActOpen(true)
  }

  const submitAction = async () => {
    if (!actTarget) return
    if (!/^\d{6}$/.test(actPin)) {
      toast.error('PIN manager harus 6 digit angka')
      return
    }
    const reason = actReason === 'Lainnya' ? actReasonNote.trim() : actReason
    if (!reason || reason.length < 2) {
      toast.error('Alasan wajib diisi')
      return
    }
    setActSubmitting(true)
    const res = await fetch(`/api/transactions/${actTarget.id}/${actMode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: actPin, reason }),
    })
    setActSubmitting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? `Gagal ${actMode}`)
      return
    }
    toast.success(actMode === 'void' ? 'Transaksi di-void' : 'Refund berhasil')
    setActOpen(false)
    load()
  }

  const reprint = async (r: Row) => {
    const res = await fetch('/api/print/receipt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transactionId: r.id }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal cetak ulang')
      return
    }
    toast.success('Struk dicetak')
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transaksi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat semua transaksi. Void / refund butuh PIN manager.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col lg:flex-row lg:items-end gap-3">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            load()
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor transaksi…"
            className="pl-9"
          />
        </form>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Filter className="size-3" /> Status
          </Label>
          <Select value={status} onValueChange={(v) => setStatus((v as typeof status) ?? 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Receipt className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Belum ada transaksi</p>
            <p className="text-xs text-muted-foreground mt-1">
              Coba ubah filter atau buka shift untuk mulai bertransaksi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">No. Trx</th>
                  <th className="px-4 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-4 py-2.5 font-semibold">Kasir</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Items</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Total</th>
                  <th className="px-4 py-2.5 font-semibold">Bayar</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold w-44"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-semibold tabular-nums">{r.trxNumber}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatJam(r.trxDate)}</td>
                    <td className="px-4 py-2.5">{r.cashierName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.itemCount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      {formatRupiah(r.total)}
                    </td>
                    <td className="px-4 py-2.5 uppercase text-xs font-semibold text-muted-foreground">
                      {r.paymentMethod}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => reprint(r)}
                          aria-label="Cetak ulang"
                        >
                          <Printer className="size-4" />
                        </Button>
                        {r.status === 'completed' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAction('void', r)}
                              aria-label="Void"
                              className="text-warning hover:text-warning"
                            >
                              <Ban className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAction('refund', r)}
                              aria-label="Refund"
                              className="text-destructive hover:text-destructive"
                            >
                              <Undo2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={actOpen} onOpenChange={setActOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actMode === 'void' ? 'Void Transaksi' : 'Refund Transaksi'}
            </DialogTitle>
            <DialogDescription>
              {actMode === 'void'
                ? 'Batalkan transaksi sebelum struk diterima customer. Aksi ini perlu PIN manager.'
                : 'Kembalikan transaksi yang sudah selesai. Stok yang dilacak akan dikembalikan. Aksi ini perlu PIN manager.'}
            </DialogDescription>
          </DialogHeader>
          {actTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <div className="text-xs text-muted-foreground">
                  {actTarget.trxNumber} • {formatJam(actTarget.trxDate)}
                </div>
                <div className="text-lg font-bold mt-1 tabular-nums">
                  {formatRupiah(actTarget.total)}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Alasan</Label>
                <Select value={actReason} onValueChange={(v) => setActReason(v ?? REASONS[actMode][0])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS[actMode].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {actReason === 'Lainnya' && (
                  <Textarea
                    value={actReasonNote}
                    onChange={(e) => setActReasonNote(e.target.value)}
                    placeholder="Tulis alasan…"
                    rows={2}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="act-pin">PIN Manager (6 digit)</Label>
                <Input
                  id="act-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={actPin}
                  onChange={(e) => setActPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl tracking-[0.5em] h-12"
                  placeholder="••••••"
                />
              </div>

              <Button
                onClick={submitAction}
                disabled={actSubmitting}
                className={`w-full h-11 font-semibold gap-2 ${
                  actMode === 'refund' ? 'bg-destructive hover:bg-destructive/90' : ''
                }`}
              >
                {actSubmitting && <Loader2 className="size-4 animate-spin" />}
                {actMode === 'void' ? 'Void Sekarang' : 'Refund Sekarang'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: Row['status'] }) {
  const styles =
    status === 'completed'
      ? 'bg-success/10 text-success'
      : status === 'voided'
      ? 'bg-warning/10 text-warning'
      : 'bg-destructive/10 text-destructive'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${styles}`}>
      {status}
    </span>
  )
}
