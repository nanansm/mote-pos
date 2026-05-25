'use client'

import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { isInMoteApp } from '@/lib/print/platform'
import { openPrinterSetup } from '@/lib/print/bridge'

/**
 * Drawer/sidebar entry that opens the native printer-setup screen.
 * Renders nothing outside the Mote POS APK (irrelevant in a browser).
 */
export function PrinterSetupNavItem({ onItemClick }: { onItemClick: () => void }) {
  const [inApp, setInApp] = useState(false)

  useEffect(() => {
    setInApp(isInMoteApp())
  }, [])

  if (!inApp) return null

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await openPrinterSetup()
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Gagal buka pengaturan printer')
        }
        onItemClick()
      }}
      className="w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors min-h-[44px] text-muted-foreground hover:bg-muted/70 hover:text-foreground"
    >
      <Printer className="size-[18px]" />
      Pengaturan Printer
    </button>
  )
}
