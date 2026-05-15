'use client'

import { Wifi, WifiOff, RefreshCcw, Loader2 } from 'lucide-react'
import { useOfflineSync } from '@/hooks/use-offline-sync'

export function OnlineIndicator({ workspaceId }: { workspaceId: string }) {
  const { isOnline, pending, syncing, runSync } = useOfflineSync(workspaceId)

  if (isOnline && pending === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-xs font-semibold"
        title="Online"
      >
        <Wifi className="size-3" />
        Online
      </span>
    )
  }

  if (!isOnline) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-xs font-semibold"
        title={`Offline${pending ? ` · ${pending} pending` : ''}`}
      >
        <WifiOff className="size-3" />
        Offline{pending > 0 ? ` · ${pending}` : ''}
      </span>
    )
  }

  // Online but pending
  return (
    <button
      onClick={runSync}
      disabled={syncing}
      className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 text-warning px-2.5 py-1 text-xs font-semibold hover:bg-warning/20 transition-colors"
      title="Klik untuk sync sekarang"
    >
      {syncing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />}
      Sync {pending}
    </button>
  )
}
