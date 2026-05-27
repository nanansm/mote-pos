'use client'

import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Custom on-screen number pad (no native <input>, so the Android keyboard never
 * pops up and never covers the small 5.5" screen). Used for cart qty, discount,
 * and other numeric entry on mobile/APK.
 *
 * Typing a digit replaces the current value (quick "1 -> 100"); backspace edits it.
 */
export function NumberPadPopup({
  open,
  onClose,
  onSubmit,
  initialValue,
  title,
  label = 'Jumlah',
  min = 1,
  max,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (value: number) => void
  initialValue: number
  title?: string
  label?: string
  min?: number
  max?: number
}) {
  // `started` = user has begun typing; until then we show initialValue.
  const [buf, setBuf] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (open) {
      setBuf('')
      setStarted(false)
    }
  }, [open, initialValue])

  const display = started ? (buf === '' ? '0' : buf) : String(initialValue)

  const press = (d: string) => {
    setBuf((prev) => {
      const base = started ? prev : '' // first keypress replaces the value
      if (base.length >= 7) return base
      return (base + d).replace(/^0+(?=\d)/, '')
    })
    setStarted(true)
  }

  const backspace = () => {
    setBuf((prev) => (started ? prev : String(initialValue)).slice(0, -1))
    setStarted(true)
  }

  const clearAll = () => {
    setBuf('')
    setStarted(true)
  }

  const commit = () => {
    let n = started ? parseInt(buf || '0', 10) : initialValue
    if (isNaN(n)) n = min
    if (n < min) n = min
    if (max != null && n > max) n = max
    onSubmit(n)
    onClose()
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="text-base truncate">{title ?? label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="text-3xl font-extrabold tabular-nums leading-tight">{display}</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {digits.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                className="h-14 rounded-xl bg-muted text-xl font-bold transition-transform active:scale-95 hover:bg-muted/70"
              >
                {k}
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="h-14 rounded-xl bg-muted text-sm font-semibold transition-transform active:scale-95 hover:bg-muted/70"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => press('0')}
              className="h-14 rounded-xl bg-muted text-xl font-bold transition-transform active:scale-95 hover:bg-muted/70"
            >
              0
            </button>
            <button
              type="button"
              onClick={backspace}
              aria-label="Hapus"
              className="h-14 rounded-xl bg-muted flex items-center justify-center transition-transform active:scale-95 hover:bg-muted/70"
            >
              <Delete className="size-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12">
              Batal
            </Button>
            <Button onClick={commit} className="flex-1 h-12 font-semibold">
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
