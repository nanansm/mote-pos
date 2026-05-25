'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { printTransaction } from '@/lib/print/receipt'
import {
  ArrowLeft,
  Ban,
  Loader2,
  Printer,
  Undo2,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { formatRupiah } from '@/lib/format'
import { getPaymentMethodLabel } from '@/lib/payment-methods/labels'

type ModifierOpt = { id?: string; name: string; priceAdd: number }
type Modifier = { groupId?: string; name: string; options: ModifierOpt[] }
type Item = {
  id: string
  productName: string
  priceUnit: string
  quantity: number
  modifiers: Modifier[]
  modifierTotal: string
  discount: string
  subtotal: string
  notes: string | null
}
type Trx = {
  id: string
  trxNumber: string
  trxDate: string
  cashierName: string
  customerName: string | null
  customerPhone: string | null
  paymentMethod: string
  paymentAmount: string
  changeAmount: string
  subtotal: string
  discount: string
  tax: string
  total: string
  status: 'completed' | 'voided' | 'refunded'
  notes: string | null
  voidReason: string | null
  voidedAt: string | null
}

type Mode = 'void' | 'refund'

const REASONS: Record<Mode, string[]> = {
  void: ['Kasir salah input', 'Customer batal pesan', 'Test transaksi', 'Lainnya'],
  refund: [
    'Produk salah / rusak',
    'Customer kembalikan barang',
    'Komplain customer',
    'Lainnya',
  ],
}

export function TransaksiDetailClient({ id }: { id: string }) {
  const [trx, setTrx] = useState<Trx | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const [actOpen, setActOpen] = useState(false)
  const [actMode, setActMode] = useState<Mode>('void')
  const [actReason, setActReason] = useState(REASONS.void[0])
  const [actReasonNote, setActReasonNote] = useState('')
  const [actPin, setActPin] = useState('')
  const [actSubmitting, setActSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/transactions/${id}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const j = await res.json()
    setTrx(j.transaction)
    setItems(j.items)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const reprint = async () => {
    // In the APK: print over Bluetooth. In a browser: existing network printer (unchanged).
    const networkPrint = async () => {
      const res = await fetch('/api/print/receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transactionId: id }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Gagal cetak ulang')
      }
    }
    try {
      await printTransaction(id, networkPrint)
      toast.success('Struk dicetak')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal cetak ulang')
    }
  }

  const openAction = (mode: Mode) => {
    setActMode(mode)
    setActReason(REASONS[mode][0])
    setActReasonNote('')
    setActPin('')
    setActOpen(true)
  }

  const submitAction = async () => {
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
    const res = await fetch(`/api/transactions/${id}/${actMode}`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    )
  }

  if (!trx) {
    return (
      <div className="space-y-4">
        <Link
          href="/transaksi"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Kembali ke Transaksi
        </Link>
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Receipt className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Transaksi tidak ditemukan</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/transaksi"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Kembali ke Transaksi
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reprint}
            className="gap-2 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
          >
            <Printer className="size-4" /> Cetak Ulang
          </Button>
          {trx.status === 'completed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAction('void')}
                className="gap-2 text-warning hover:bg-warning/10 hover:border-warning/40 hover:text-warning"
              >
                <Ban className="size-4" /> Void
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAction('refund')}
                className="gap-2 text-destructive hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
              >
                <Undo2 className="size-4" /> Refund
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {trx.trxNumber}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(trx.trxDate).toLocaleString('id-ID')}</span>
              <span className="size-1 rounded-full bg-border" />
              <span>{trx.cashierName}</span>
              <span className="size-1 rounded-full bg-border" />
              <StatusBadge status={trx.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Total
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {formatRupiah(Number(trx.total))}
            </div>
          </div>
        </div>

        {(trx.customerName || trx.customerPhone) && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Pelanggan
            </div>
            <div className="font-semibold">{trx.customerName ?? '—'}</div>
            {trx.customerPhone && (
              <div className="text-xs text-muted-foreground">{trx.customerPhone}</div>
            )}
          </div>
        )}

        {trx.notes && (
          <p className="mt-4 text-sm text-muted-foreground border-l-2 border-border pl-3">
            {trx.notes}
          </p>
        )}

        {trx.voidReason && (
          <div className="mt-4 rounded-lg bg-warning/10 text-warning p-3 text-sm">
            <div className="font-semibold">Void</div>
            <div className="text-xs">{trx.voidReason}</div>
            {trx.voidedAt && (
              <div className="text-[11px] mt-0.5 opacity-75">
                {new Date(trx.voidedAt).toLocaleString('id-ID')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border font-semibold">
          Items ({items.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Produk</th>
                <th className="px-5 py-2.5 font-semibold text-right w-20">Qty</th>
                <th className="px-5 py-2.5 font-semibold text-right w-32">Harga</th>
                <th className="px-5 py-2.5 font-semibold text-right w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{it.productName}</div>
                    {it.modifiers?.length > 0 && (
                      <ul className="mt-0.5 text-xs text-muted-foreground space-y-0.5">
                        {it.modifiers.map((m, idx) => (
                          <li key={idx}>
                            {m.name}: {m.options.map((o) => o.name).join(', ')}
                          </li>
                        ))}
                      </ul>
                    )}
                    {it.notes && (
                      <p className="mt-1 text-xs italic text-muted-foreground">{it.notes}</p>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{it.quantity}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {formatRupiah(Number(it.priceUnit) + Number(it.modifierTotal))}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-semibold">
                    {formatRupiah(Number(it.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 max-w-md ml-auto space-y-2 text-sm">
        <Row label="Subtotal" value={formatRupiah(Number(trx.subtotal))} />
        {Number(trx.discount) > 0 && (
          <Row label="Diskon" value={`- ${formatRupiah(Number(trx.discount))}`} />
        )}
        {Number(trx.tax) > 0 && <Row label="Pajak" value={formatRupiah(Number(trx.tax))} />}
        <div className="border-t border-border my-2" />
        <Row
          label={<span className="font-bold">Total</span>}
          value={<span className="font-bold text-lg">{formatRupiah(Number(trx.total))}</span>}
        />
        <Row
          label={getPaymentMethodLabel(trx.paymentMethod)}
          value={formatRupiah(Number(trx.paymentAmount))}
        />
        {Number(trx.changeAmount) > 0 && (
          <Row
            label="Kembali"
            value={
              <span className="font-bold text-success">
                {formatRupiah(Number(trx.changeAmount))}
              </span>
            }
          />
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
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-xs text-muted-foreground">{trx.trxNumber}</div>
              <div className="text-lg font-bold mt-1 tabular-nums">
                {formatRupiah(Number(trx.total))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Alasan</Label>
              <Select
                value={actReason}
                onValueChange={(v) => setActReason(v ?? REASONS[actMode][0])}
              >
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
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: Trx['status'] }) {
  const styles =
    status === 'completed'
      ? 'bg-success/10 text-success'
      : status === 'voided'
        ? 'bg-warning/10 text-warning'
        : 'bg-destructive/10 text-destructive'
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles}`}>
      {status}
    </span>
  )
}
