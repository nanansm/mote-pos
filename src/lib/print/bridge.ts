// Access to the native BluetoothPrinter Capacitor plugin (only present in the APK).
//
// NOTE: the APK loads pos.motekreatif.com via Capacitor `server.url`. Capacitor
// still injects `window.Capacitor` (and the registered plugin proxies) into the
// remote page, so these calls work from the live site when run inside the APK.
// Detection of "are we in the APK" lives in ./platform (user-agent based, which
// is the reliable signal with a remote server.url).

import type { ReceiptData } from './types'

export interface BluetoothPrinterBridge {
  requestPermissions(): Promise<{ granted: boolean }>
  isConnected(): Promise<{ connected: boolean }>
  connect(options: { address?: string; name?: string }): Promise<{ connected: boolean }>
  printReceipt(options: { receipt: ReceiptData }): Promise<{ success: boolean }>
  printRaw(options: { data: string }): Promise<{ success: boolean }>
  disconnect(): Promise<void>
  openSetup(): Promise<void>
  getSavedPrinter(): Promise<{ name?: string; address?: string }>
  testPrint(): Promise<{ success: boolean }>
}

export function getPrinterBridge(): BluetoothPrinterBridge | null {
  if (typeof window === 'undefined') return null
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: { BluetoothPrinter?: BluetoothPrinterBridge } }
  }).Capacitor
  return cap?.Plugins?.BluetoothPrinter ?? null
}

/** Open the native printer-setup screen. Throws if not running in the APK. */
export async function openPrinterSetup(): Promise<void> {
  const bridge = getPrinterBridge()
  if (!bridge) throw new Error('Pengaturan printer hanya tersedia di aplikasi Android')
  await bridge.openSetup()
}

export interface PrinterStatus {
  savedName?: string
  address?: string
  connected: boolean
}

/** Saved printer + live connection status. Safe to call outside the APK (returns disconnected). */
export async function getPrinterStatus(): Promise<PrinterStatus> {
  const bridge = getPrinterBridge()
  if (!bridge) return { connected: false }
  const [saved, conn] = await Promise.all([
    bridge.getSavedPrinter().catch(() => ({}) as { name?: string; address?: string }),
    bridge.isConnected().catch(() => ({ connected: false })),
  ])
  return { savedName: saved.name, address: saved.address, connected: conn.connected }
}
