'use client'

import {
  deletePending,
  deletePendingShiftClose,
  listPendingShiftCloses,
  listPendingTransactions,
  updatePending,
} from './db'

const MAX_RETRIES = 3

export type SyncReport = {
  total: number
  success: number
  failed: number
  remaining: number
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function postWithRetry(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export async function syncPendingTransactions(workspaceId: string): Promise<SyncReport> {
  const pending = await listPendingTransactions(workspaceId)
  let success = 0
  let failed = 0
  for (const item of pending) {
    if (item.syncFailed && item.attempts >= MAX_RETRIES) {
      failed++
      continue
    }
    try {
      const res = await postWithRetry('/api/transactions', item.payload)
      if (res.ok) {
        await deletePending(item.uuid)
        success++
      } else if (res.status === 409) {
        // duplicate trxNumber — assume already synced
        await deletePending(item.uuid)
        success++
      } else {
        const errText = await res.text().catch(() => '')
        const nextAttempts = item.attempts + 1
        await updatePending({
          ...item,
          attempts: nextAttempts,
          lastError: errText.slice(0, 300),
          syncFailed: nextAttempts >= MAX_RETRIES,
        })
        failed++
        // exponential backoff between items
        await delay(Math.min(2000, 250 * nextAttempts))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      const nextAttempts = item.attempts + 1
      await updatePending({
        ...item,
        attempts: nextAttempts,
        lastError: msg,
        syncFailed: nextAttempts >= MAX_RETRIES,
      })
      failed++
      await delay(Math.min(2000, 250 * nextAttempts))
    }
  }
  const remaining = (await listPendingTransactions(workspaceId)).length
  return { total: pending.length, success, failed, remaining }
}

export async function syncPendingShiftCloses(workspaceId: string): Promise<SyncReport> {
  const pending = await listPendingShiftCloses(workspaceId)
  let success = 0
  let failed = 0
  for (const item of pending) {
    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item.payload),
      })
      if (res.ok) {
        await deletePendingShiftClose(item.uuid)
        success++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }
  const remaining = (await listPendingShiftCloses(workspaceId)).length
  return { total: pending.length, success, failed, remaining }
}

export async function syncAll(workspaceId: string): Promise<SyncReport> {
  const a = await syncPendingTransactions(workspaceId)
  const b = await syncPendingShiftCloses(workspaceId)
  return {
    total: a.total + b.total,
    success: a.success + b.success,
    failed: a.failed + b.failed,
    remaining: a.remaining + b.remaining,
  }
}
