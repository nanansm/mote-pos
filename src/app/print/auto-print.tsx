'use client'

import { useEffect } from 'react'

export function AutoPrint({ delayMs = 300 }: { delayMs?: number }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = setTimeout(() => {
      try {
        window.print()
      } catch {
        // ignore
      }
    }, delayMs)
    const onAfter = () => {
      // Try to close. Browsers block window.close on tabs not opened by script,
      // so this is best-effort.
      try {
        window.close()
      } catch {
        // ignore
      }
    }
    window.addEventListener('afterprint', onAfter)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', onAfter)
    }
  }, [delayMs])
  return null
}
