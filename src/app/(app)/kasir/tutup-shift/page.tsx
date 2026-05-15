'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatRupiah } from '@/lib/format'

type Summary = {
  shift: {
    id: string
    openedAt: string
    openingBalance: string
    cashierName: string
    status: 'open' | 'closed'
  }
  summary: {
    byMethod: Record<string, { total: number; count: number }>
    totalAll: number
    totalCount: number
    expectedBalance: number
  }
}

export default function TutupShiftPage() {
  const router = useRouter()
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [data, setData] = useState<Summary | null>(null)
  const [closing, setClosing] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const sid = typeof window !== 'undefined' ? localStorage.getItem('pos:shift_id') : null
    if (!sid) {
      toast.error('Tidak ada shift aktif')
      router.push('/dashboard')
      return
    }
    setShiftId(sid)
    fetch(`/api/shifts/${sid}`)
      .then(async (r) => {
        if (!r.ok) {
          toast.error('Shift tidak ditemukan')
          router.push('/dashboard')
          return
        }
        const j = (await r.json()) as Summary
        setData(j)
      })
  }, [router])

  const submit = async () => {
    if (!shiftId) return
    if (closing < 0) return toast.error('Saldo akhir tidak valid')
    setLoading(true)
    const res = await fetch('/api/shifts/close', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shiftId, closingBalance: closing, notes }),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal tutup shift')
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos:shift_id')
      localStorage.removeItem('pos:cashier_id')
      localStorage.removeItem('pos:cashier_name')
      localStorage.removeItem('pos:shift_opened_at')
    }
    toast.success('Shift ditutup')
    router.push('/dashboard')
  }

  if (!data) {
    return <div className="text-sm text-neutral-500">Memuat ringkasan…</div>
  }

  const diff = closing - data.summary.expectedBalance

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-neutral-900">Tutup Shift</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Kasir <strong>{data.shift.cashierName}</strong> • Dibuka{' '}
          {new Date(data.shift.openedAt).toLocaleString('id-ID')}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold">Ringkasan Transaksi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Cash" value={data.summary.byMethod.cash?.total ?? 0} />
          <Stat label="QRIS" value={data.summary.byMethod.qris?.total ?? 0} />
          <Stat label="Transfer" value={data.summary.byMethod.transfer?.total ?? 0} />
          <Stat label="Total" value={data.summary.totalAll} bold />
        </div>
        <div className="text-sm text-neutral-600">
          {data.summary.totalCount} transaksi tercatat di shift ini.
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold">Hitung Saldo Kas</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-neutral-600">Saldo Awal</div>
          <div className="text-right">{formatRupiah(data.shift.openingBalance)}</div>
          <div className="text-neutral-600">+ Cash Masuk</div>
          <div className="text-right">
            {formatRupiah(data.summary.byMethod.cash?.total ?? 0)}
          </div>
          <div className="font-medium">Expected Cash</div>
          <div className="text-right font-medium">
            {formatRupiah(data.summary.expectedBalance)}
          </div>
        </div>
        <div>
          <Label htmlFor="closing">Saldo Akhir (uang fisik di laci)</Label>
          <CurrencyInput
            id="closing"
            value={closing}
            onValueChange={(n) => setClosing(n)}
            className="mt-1"
          />
        </div>
        <div
          className={`rounded-lg p-3 text-sm ${
            diff === 0
              ? 'bg-emerald-50 text-emerald-700'
              : diff > 0
              ? 'bg-amber-50 text-amber-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          Selisih: <strong>{formatRupiah(diff)}</strong>{' '}
          {diff === 0
            ? '(Pas)'
            : diff > 0
            ? '(Surplus — uang lebih)'
            : '(Kurang — uang kurang)'}
        </div>
        <div>
          <Label>Catatan</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="cth. selisih karena uang receh"
            rows={3}
            className="mt-1"
          />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? 'Memproses…' : 'Tutup Shift'}
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 ${bold ? 'text-lg font-semibold' : 'text-base font-medium'}`}>
        {formatRupiah(value)}
      </div>
    </div>
  )
}
