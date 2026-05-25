'use client'

import { useCallback, useEffect, useState } from 'react'
import { Printer, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { isInMoteApp } from '@/lib/print/platform'
import {
  getPrinterBridge,
  getPrinterStatus,
  openPrinterSetup,
  type PrinterStatus,
} from '@/lib/print/bridge'

/**
 * "Printer Bluetooth (Aplikasi Android)" section for Pengaturan → Struk & Print.
 * Inside the APK: shows live connection status + opens the native setup screen.
 * In a browser: shown disabled with a note (Bluetooth print is APK-only).
 */
export function PrinterSettingsSection() {
  const [inApp, setInApp] = useState(false)
  const [status, setStatus] = useState<PrinterStatus>({ connected: false })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await getPrinterStatus())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const app = isInMoteApp()
    setInApp(app)
    if (app) void refresh()
  }, [refresh])

  const onSetup = async () => {
    try {
      await openPrinterSetup()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal buka pengaturan printer')
    }
  }

  const onTest = async () => {
    const bridge = getPrinterBridge()
    if (!bridge) return
    setTesting(true)
    try {
      await bridge.testPrint()
      toast.success('Test print terkirim. Cek struk keluar.')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal test print')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Printer className="size-5 text-muted-foreground" />
        <h3 className="font-semibold">Printer Bluetooth (Aplikasi Android)</h3>
      </div>

      {!inApp ? (
        <>
          <p className="text-sm text-muted-foreground">
            Cetak struk via Bluetooth (printer RPP02N) hanya tersedia di aplikasi Android Mote POS.
            Di browser, struk dicetak lewat printer jaringan / preview cetak biasa.
          </p>
          <Button disabled variant="outline" className="gap-2">
            <Printer className="size-4" />
            Buka Pengaturan Printer
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-block size-2.5 rounded-full ${
                status.connected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            {loading ? (
              <span className="text-muted-foreground">Memeriksa…</span>
            ) : status.connected ? (
              <span className="font-medium text-emerald-600">
                Tersambung: {status.savedName ?? 'RPP02N'}
              </span>
            ) : (
              <span className="font-medium text-red-600">
                Belum tersambung
                {status.savedName ? ` (tersimpan: ${status.savedName})` : ''}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onSetup} className="gap-2">
              <Printer className="size-4" />
              Buka Pengaturan Printer
            </Button>
            <Button onClick={onTest} variant="outline" className="gap-2" disabled={testing}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Test Print
            </Button>
            <Button onClick={refresh} variant="ghost" size="icon" aria-label="Refresh status">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Pilih printer &quot;RPP02N&quot; dan lakukan test print. Pastikan printer sudah di-pair di
            Pengaturan Bluetooth Android.
          </p>
        </>
      )}
    </div>
  )
}
