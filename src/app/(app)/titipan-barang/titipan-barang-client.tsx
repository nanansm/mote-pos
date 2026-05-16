'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  Package2,
  CheckCircle2,
  Calendar,
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

type PickupRow = {
  id: string
  trxNumber: string
  trxDate: string
  total: number
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  pickupStatus: 'pickup_immediate' | 'pickup_pending' | 'pickup_completed'
  pickupAt: string | null
  pickupNotes: string | null
  items: number
  qty: number
}

export function TitipanBarangClient() {
  const [data, setData] = useState<PickupRow[]>([])
  const [stats, setStats] = useState({ pending: 0, monthDone: 0 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'pending' | 'completed' | 'all'>('pending')
  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [confirmRow, setConfirmRow] = useState<PickupRow | null>(null)
  const [confirmNotes, setConfirmNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const url = new URL('/api/pickups', window.location.origin)
    url.searchParams.set('status', status)
    if (q) url.searchParams.set('q', q)
    if (dateFrom) url.searchParams.set('from', dateFrom)
    if (dateTo) url.searchParams.set('to', dateTo)
    const res = await fetch(url.toString())
    if (res.ok) {
      const j = await res.json()
      setData(j.data ?? [])
      setStats(j.stats ?? { pending: 0, monthDone: 0 })
    }
    setLoading(false)
  }, [status, q, dateFrom, dateTo])

  useEffect(() => {
    load()
  }, [load])

  const confirmPickup = async () => {
    if (!confirmRow) return
    setSubmitting(true)
    const res = await fetch(`/api/pickups/${confirmRow.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes: confirmNotes || null }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal konfirmasi')
    }
    toast.success('Barang ditandai sudah diambil')
    setConfirmRow(null)
    setConfirmNotes('')
    load()
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Titipan Barang</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transaksi yang barangnya belum diambil customer.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Belum Diambil" Icon={Package2} value={String(stats.pending)} />
        <StatCard
          label="Diambil Bulan Ini"
          Icon={CheckCircle2}
          value={String(stats.monthDone)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pkq">Cari (TRX, nama, HP)</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input id="pkq" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus((v as 'pending' | 'completed' | 'all') ?? 'pending')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Belum Diambil</SelectItem>
              <SelectItem value="completed">Sudah Diambil</SelectItem>
              <SelectItem value="all">Semua</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="pkfrom">Dari</Label>
            <Input
              id="pkfrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkto">Sampai</Label>
            <Input
              id="pkto"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Belum ada data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">TRX</th>
                  <th className="px-5 py-2.5 font-semibold">Tanggal Bayar</th>
                  <th className="px-5 py-2.5 font-semibold">Customer</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Items</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((r) => {
                  const pending = r.pickupStatus === 'pickup_pending'
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-2.5 font-semibold tabular-nums">{r.trxNumber}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {new Date(r.trxDate).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-2.5">
                        {r.customerName ?? <span className="text-muted-foreground">—</span>}
                        {r.customerPhone && (
                          <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-semibold">
                        {formatRupiah(r.total)}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{r.qty}</td>
                      <td className="px-5 py-2.5">
                        {pending ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">
                            Belum diambil
                          </span>
                        ) : r.pickupStatus === 'pickup_completed' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">
                            Sudah diambil
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                            Langsung
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {pending && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setConfirmRow(r)
                              setConfirmNotes(r.pickupNotes ?? '')
                            }}
                            className="gap-1.5 transition-colors hover:bg-brand-500/90"
                          >
                            <CheckCircle2 className="size-4" /> Konfirmasi Ambil
                          </Button>
                        )}
                        {!pending && r.pickupAt && (
                          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="size-3" />
                            {new Date(r.pickupAt).toLocaleDateString('id-ID')}
                          </div>
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

      <Dialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pengambilan</DialogTitle>
            <DialogDescription>
              Tandai transaksi <span className="font-bold">{confirmRow?.trxNumber}</span> sudah
              diambil oleh customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cnotes">Catatan (opsional)</Label>
              <Textarea
                id="cnotes"
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                rows={2}
                placeholder="cth. Diambil sopir A"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmRow(null)} className="flex-1">
                Batal
              </Button>
              <Button
                onClick={confirmPickup}
                disabled={submitting}
                className="flex-1 gap-2 transition-colors hover:bg-brand-500/90"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Konfirmasi
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
