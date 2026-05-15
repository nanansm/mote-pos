'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { pendingCount } from '@/lib/offline/db'
import { syncAll } from '@/lib/offline/sync'
import { useOnlineStatus } from './use-online-status'

export function useOfflineSync(workspaceId: string | null | undefined) {
  const { isOnline } = useOnlineStatus()
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    if (!workspaceId) return
    try {
      const n = await pendingCount(workspaceId)
      setPending(n)
    } catch {
      // ignore
    }
  }, [workspaceId])

  const runSync = useCallback(async () => {
    if (!workspaceId) return
    if (syncing) return
    setSyncing(true)
    const before = await pendingCount(workspaceId)
    if (before > 0) toast.message(`Sync ${before} transaksi pending…`)
    const report = await syncAll(workspaceId)
    setSyncing(false)
    setPending(report.remaining)
    if (report.success > 0) {
      toast.success(`Sync selesai: ${report.success} berhasil`)
    }
    if (report.failed > 0 && report.remaining > 0) {
      toast.error(`${report.remaining} transaksi belum sync, akan dicoba lagi`)
    }
  }, [workspaceId, syncing])

  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  useEffect(() => {
    if (isOnline) {
      runSync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, workspaceId])

  return { isOnline, pending, syncing, runSync, refreshCount }
}
