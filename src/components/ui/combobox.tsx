'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { cn } from '@/lib/utils'

export type ComboboxProps = {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  emptyMessage?: string
  allowFreeText?: boolean
  className?: string
  id?: string
  disabled?: boolean
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Pilih atau ketik…',
  emptyMessage = 'Tidak ada hasil',
  allowFreeText = true,
  className,
  id,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery(value)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, value])

  const normalizedOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const opt of options) {
      const k = opt.trim()
      if (!k) continue
      const lc = k.toLowerCase()
      if (seen.has(lc)) continue
      seen.add(lc)
      out.push(k)
    }
    return out
  }, [options])

  const filtered = useMemo(() => {
    if (!query.trim()) return normalizedOptions
    const q = query.toLowerCase()
    return normalizedOptions.filter((o) => o.toLowerCase().includes(q))
  }, [normalizedOptions, query])

  const queryIsNew =
    allowFreeText &&
    query.trim().length > 0 &&
    !normalizedOptions.some((o) => o.toLowerCase() === query.trim().toLowerCase())

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        choose(filtered[0])
      } else if (queryIsNew) {
        choose(query.trim())
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none',
          'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'md:text-sm',
          className,
        )}
      >
        <span className={cn(!value && 'text-muted-foreground')}>
          {value || placeholder}
        </span>
        <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-(--radix-popover-trigger-width) min-w-[14rem]"
        align="start"
        sideOffset={4}
      >
        <div className="p-1.5 border-b border-border">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-8 px-2 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
            autoComplete="off"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto py-1">
          {queryIsNew && (
            <li>
              <button
                type="button"
                onClick={() => choose(query.trim())}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left"
              >
                <Plus className="size-3.5 text-primary" />
                Tambah <span className="font-semibold">&quot;{query.trim()}&quot;</span>
              </button>
            </li>
          )}
          {filtered.length === 0 && !queryIsNew && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </li>
          )}
          {filtered.map((opt) => {
            const active = opt.toLowerCase() === value.toLowerCase()
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => choose(opt)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left',
                    active && 'font-semibold',
                  )}
                >
                  <span>{opt}</span>
                  {active && <Check className="size-3.5 text-primary" />}
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
