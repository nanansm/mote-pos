'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Info, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatRupiah } from '@/lib/format'
import { ShiftSummaryCard, type ShiftSummary } from '@/components/kasir/shift-summary'

type ShiftResponse = {
  shift: {
    id: string
    openedAt: string
    openingBalance: string
    cashierName: string
    status: 'open' | 'closed'
  }
  summary: ShiftSummary
}

type SubmitState = 'idle' | 'submitting' | 'done'

export default function TutupShiftPage() {
  const router = useRouter()
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [data, setData] = useState<ShiftResponse | null>(null)
  const [closing, setClosing] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [tipOpen, setTipOpen] = useState(false)

  useEffect(() => {
    const sid = typeof window !== 'undefined' ? localStorage.getItem('pos:shift_id') : null
    if (!sid) {
      toast.error('Tidak ada shift aktif')
      router.push('/dashboard')
      return
    }
    setShiftId(sid)
    fetch(`/api/shifts/${sid}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          toast.error('Shift tidak ditemukan')
          router.push('/dashboard')
          return
        }
        const j = (await r.json()) as ShiftResponse
        setData(j)
      })
  }, [router])

  const submit = async () => {
    // STRICT GUARD — only fire once per page load.
    if (submitState !== 'idle') {
      console.warn('[tutup-shift] submit blocked, state=', submitState)
      return
    }
    if (!shiftId) return
    if (closing < 0) return toast.error('Saldo akhir tidak valid')

    setSubmitState('submitting')

    let res: Response
    try {
      res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ shiftId, closingBalance: closing, notes }),
      })
    } catch (err) {
      console.error('[tutup-shift] network error', err)
      setSubmitState('idle')
      return toast.error('Gagal terhubung ke server')
    }

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setSubmitState('idle')
      return toast.error((j as { error?: string }).error ?? 'Gagal tutup shift')
    }

    const j = (await res.json().catch(() => ({}))) as {
      alreadyClosed?: boolean
      shiftId?: string
    }

    // FROZEN — prevent any further clicks while we redirect.
    setSubmitState('done')

    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos:shift_id')
      localStorage.removeItem('pos:cashier_id')
      localStorage.removeItem('pos:cashier_name')
      localStorage.removeItem('pos:cashier_role')
      localStorage.removeItem('pos:shift_opened_at')
    }
    if (j.alreadyClosed) {
      toast.info('Shift sudah ditutup sebelumnya')
    } else {
      toast.success('Shift ditutup')
    }
    router.push(`/kasir/shift-closed?id=${j.shiftId ?? shiftId}`)
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground">Memuat ringkasan…</div>
  }

  const expectedCash = data.summary.expectedBalance
  const diff = closing - expectedCash

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Tutup Shift</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kasir <strong>{data.shift.cashierName}</strong> • Dibuka{' '}
          {new Date(data.shift.openedAt).toLocaleString('id-ID')}
        </p>
      </div>

      <ShiftSummaryCard summary={data.summary} />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Hitung Saldo Kas</h2>
          <button
            type="button"
            aria-label="Info Expected Cash"
            onClick={() => setTipOpen((v) => !v)}
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            onFocus={() => setTipOpen(true)}
            onBlur={() => setTipOpen(false)}
            className="relative inline-flex items-center justify-center size-5 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Info className="size-4" />
            {tipOpen && (
              <span
                role="tooltip"
                className="absolute left-1/2 top-full mt-2 z-20 -translate-x-1/2 w-72 rounded-lg border border-border bg-popover text-popover-foreground p-3 text-xs leading-relaxed shadow-lg text-left"
              >
                Hanya menghitung uang fisik <strong>cash</strong> di laci kasir.
                <br />
                <br />
                <strong>Tidak termasuk:</strong>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  <li>Hutang (uang belum masuk)</li>
                  <li>Saldo Titipan (uang sudah masuk sebelumnya)</li>
                  <li>QRIS / Transfer (masuk ke rekening, bukan kas)</li>
                </ul>
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-muted-foreground">Saldo Awal</div>
          <div className="text-right tabular-nums">
            {formatRupiah(data.shift.openingBalance)}
          </div>
          <div className="text-muted-foreground">+ Cash Masuk</div>
          <div className="text-right tabular-nums">{formatRupiah(data.summary.cashIn)}</div>
          <div className="font-medium border-t border-border pt-2">Expected Cash</div>
          <div className="text-right font-medium tabular-nums border-t border-border pt-2">
            {formatRupiah(expectedCash)}
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
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : diff > 0
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
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

        <Button
          onClick={submit}
          disabled={submitState !== 'idle'}
          className="w-full h-11 font-semibold gap-2"
        >
          {submitState === 'submitting' ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Memproses…
            </>
          ) : submitState === 'done' ? (
            <>
              <Lock className="size-4" /> Selesai
            </>
          ) : (
            <>
              <Lock className="size-4" /> Tutup Shift
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
