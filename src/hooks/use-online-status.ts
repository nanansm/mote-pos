'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine
  })

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return { isOnline }
}
