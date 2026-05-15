'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

const idFmt = new Intl.NumberFormat('id-ID')

export function generateQuickAmounts(total: number): number[] {
  if (total <= 0) return [0]
  const result = new Set<number>([total])
  const candidates = [50_000, 100_000, 150_000, 200_000, 300_000, 500_000, 1_000_000]
  for (const c of candidates) if (c >= total) result.add(c)
  const roundUp10k = Math.ceil(total / 10_000) * 10_000
  if (roundUp10k > total) result.add(roundUp10k)
  return Array.from(result)
    .sort((a, b) => a - b)
    .slice(0, 6)
}

/** Compact nominal label used inside touchscreen quick-amount buttons. No "Rp" prefix. */
export function formatQuickNominal(n: number): string {
  return idFmt.format(Math.round(n))
}

export type CashAmountInputProps = {
  cashRequired: number
  value: number
  onValueChange: (v: number) => void
  label?: string
  showKembalian?: boolean
  className?: string
}

export function CashAmountInput({
  cashRequired,
  value,
  onValueChange,
  label = 'Uang Diterima',
  showKembalian = true,
  className,
}: CashAmountInputProps) {
  const quickAmounts = useMemo(() => generateQuickAmounts(Math.max(0, cashRequired)), [cashRequired])
  const kembalian = Math.max(0, value - cashRequired)
  const kurang = Math.max(0, cashRequired - value)

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {cashRequired > 0 && (
        <QuickAmountGrid value={value} amounts={quickAmounts} onPick={onValueChange} />
      )}
      <CurrencyInput value={value} onValueChange={onValueChange} placeholder="0" />
      {showKembalian && cashRequired > 0 && (
        <div
          className={cn(
            'rounded-lg p-3 flex items-center justify-between text-sm',
            kurang > 0
              ? 'bg-destructive/10 text-destructive'
              : kembalian > 0
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <span className="font-semibold">
            {kurang > 0 ? 'Kurang' : kembalian > 0 ? 'Kembalian' : 'Pas'}
          </span>
          <span className="font-bold tabular-nums">
            {kurang > 0 ? formatRupiah(kurang) : kembalian > 0 ? formatRupiah(kembalian) : 'Rp 0'}
          </span>
        </div>
      )}
    </div>
  )
}

/** Reusable touchscreen-friendly quick amount grid. Renders nominal without "Rp" prefix. */
export function QuickAmountGrid({
  amounts,
  value,
  onPick,
  className,
}: {
  amounts: number[]
  value: number
  onPick: (n: number) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 gap-2 w-full',
        className,
      )}
    >
      {amounts.map((q, i) => {
        const active = value === q
        const isExact = i === 0
        return (
          <button
            type="button"
            key={q}
            onClick={() => onPick(q)}
            className={cn(
              'relative min-h-[56px] rounded-lg border px-2.5 py-2 text-base font-bold tabular-nums leading-none transition-all flex flex-col items-center justify-center gap-1 truncate',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : isExact
                ? 'border-primary bg-primary/5 hover:bg-primary/10'
                : 'border-border bg-card hover:bg-muted/50',
            )}
          >
            {isExact && (
              <span className="text-[9px] uppercase tracking-wider opacity-70 font-semibold">
                Pas
              </span>
            )}
            <span className="truncate w-full text-center">{formatQuickNominal(q)}</span>
          </button>
        )
      })}
    </div>
  )
}
