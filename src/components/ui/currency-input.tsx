'use client'

import { forwardRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const idFormatter = new Intl.NumberFormat('id-ID')

function digitsOnly(s: string) {
  return s.replace(/\D/g, '')
}

function formatThousand(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(digitsOnly(String(value)))
  if (!Number.isFinite(n)) return ''
  return idFormatter.format(n)
}

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | null | undefined
  onValueChange: (n: number) => void
  prefix?: string
  allowZero?: boolean
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    { value, onValueChange, prefix = 'Rp', className, allowZero = true, placeholder, ...rest },
    ref,
  ) {
    const [display, setDisplay] = useState<string>(() =>
      value === null || value === undefined || (value === 0 && !allowZero)
        ? ''
        : formatThousand(value),
    )

    useEffect(() => {
      const cleanCurrent = digitsOnly(display)
      const next = value === null || value === undefined ? '' : String(value)
      if (cleanCurrent !== next) {
        setDisplay(formatThousand(value ?? 0))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = digitsOnly(e.target.value)
      const num = raw === '' ? 0 : Number(raw)
      setDisplay(formatThousand(raw))
      onValueChange(num)
    }

    return (
      <div className={cn('relative', className)}>
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground"
          aria-hidden
        >
          {prefix}
        </span>
        <input
          ref={ref}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder ?? '0'}
          value={display}
          onChange={handleChange}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 pl-10 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none',
            'placeholder:text-muted-foreground',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'md:text-sm tabular-nums',
          )}
          {...rest}
        />
      </div>
    )
  },
)
