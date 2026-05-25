// Universal receipt printing.
//
// - Inside the Mote POS APK  -> print over Bluetooth (ESC/POS) via the native
//   BluetoothPrinter plugin, generating ESC/POS from a ReceiptData JSON.
// - In a normal browser       -> run the caller's existing print mechanism
//   (window.open('/print/...') or the network-printer API). Nothing existing
//   is removed; the browser path stays the fallback.

import { isInMoteApp } from './platform'
import { getPrinterBridge } from './bridge'
import type { ReceiptData } from './types'

/**
 * Print a ReceiptData via the native Bluetooth bridge.
 * Ensures permission + connection first; if the printer is not connected it
 * opens the native setup screen and throws a friendly message.
 */
export async function printReceiptData(receipt: ReceiptData): Promise<boolean> {
  const printer = getPrinterBridge()
  if (!printer) throw new Error('Bridge printer tidak tersedia')

  await printer.requestPermissions()

  let connected = (await printer.isConnected()).connected
  if (!connected) {
    try {
      await printer.connect({ name: 'RPP02N' })
    } catch {
      // ignore; re-check below
    }
    connected = (await printer.isConnected()).connected
  }

  if (!connected) {
    await printer.openSetup()
    throw new Error('Printer belum tersambung. Buka Pengaturan Printer lalu coba lagi.')
  }

  const res = await printer.printReceipt({ receipt })
  return Boolean(res?.success)
}

/** Fetch a transaction's ReceiptData JSON then print it over Bluetooth (APK only). */
export async function printTransactionViaApk(trxId: string): Promise<boolean> {
  const res = await fetch('/api/print/receipt-data', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transactionId: trxId }),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error ?? 'Gagal mengambil data struk')
  }
  const receipt = (await res.json()) as ReceiptData
  return printReceiptData(receipt)
}

/**
 * Print a transaction's receipt. In the APK it prints over Bluetooth; otherwise
 * it runs `fallback` (the caller's existing browser/network print).
 */
export async function printTransaction(
  trxId: string,
  fallback: () => void | Promise<void>,
): Promise<void> {
  if (isInMoteApp()) {
    await printTransactionViaApk(trxId)
  } else {
    await fallback()
  }
}
