'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, Lock } from 'lucide-react'
import { useOfflineSync } from '@/hooks/use-offline-sync'

type Props = {
  workspaceId: string
  workspaceName: string
  outletName?: string
  onOpenMenu: () => void
}

const HIDE_TUTUP_SHIFT_ON: string[] = [
  '/kasir/tutup-shift',
  '/kasir/shift-closed',
  '/kasir/buka-shift',
]

export function MobileHeader({
  workspaceId,
  workspaceName,
  outletName,
  onOpenMenu,
}: Props) {
  const pathname = usePathname() ?? ''
  const [hasShift, setHasShift] = useState(false)
  const { isOnline, pending } = useOfflineSync(workspaceId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHasShift(!!localStorage.getItem('pos:shift_id'))
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'pos:shift_id') {
        setHasShift(!!localStorage.getItem('pos:shift_id'))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [pathname])

  const hideTutupShift =
    !hasShift || HIDE_TUTUP_SHIFT_ON.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const dotClass = !isOnline
    ? 'bg-destructive'
    : pending > 0
    ? 'bg-amber-500'
    : 'bg-emerald-500'
  const statusLabel = !isOnline
    ? `Offline${pending > 0 ? ` · ${pending}` : ''}`
    : pending > 0
    ? `Sync ${pending}`
    : 'Online'

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-background border-b border-border/60">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="inline-flex items-center justify-center size-11 -ml-2 rounded-md hover:bg-muted/70 active:bg-muted shrink-0"
        >
          <Menu className="size-[22px]" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium leading-tight truncate">
            {workspaceName}
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight truncate flex items-center gap-1">
            {outletName ? <span className="truncate">{outletName}</span> : null}
            <span aria-hidden className="opacity-60">
              ·
            </span>
            <span className={`size-1.5 rounded-full shrink-0 ${dotClass}`} />
            <span className="shrink-0">{statusLabel}</span>
          </div>
        </div>

        {!hideTutupShift && (
          <Link
            href="/kasir/tutup-shift"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold border border-[#F09595] bg-[#FCEBEB] text-[#A32D2D] shrink-0 active:bg-[#F9D9D9]"
            aria-label="Tutup Shift"
          >
            <Lock className="size-3.5" />
            Tutup Shift
          </Link>
        )}
      </div>
    </header>
  )
}
