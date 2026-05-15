'use client'

import { useEffect } from 'react'

export function useKeepAlive(intervalMs = 45_000) {
  useEffect(() => {
    let cancelled = false
    const ping = () => {
      if (cancelled) return
      fetch('/api/health', { cache: 'no-store' }).catch(() => {})
    }
    ping()
    const id = setInterval(ping, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])
}
