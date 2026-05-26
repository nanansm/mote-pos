// Server-side: assemble a transaction's ReceiptData JSON for the native
// Bluetooth printer (APK). Mirrors the data shown by /print/receipt/[id].

import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  cashiers,
  outlets,
  transactionItems,
  transactionPayments,
  transactions,
  workspaces,
} from '../db/schema'
import { getPaymentMethodLabel } from '../payment-methods/labels'
import type { ReceiptData, ReceiptItem } from './types'

function fmtDate(d: Date): string {
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12: false,
  })
}

type ItemModifier = { name?: string; options?: Array<{ name?: string; priceAdd?: number }> }

export async function buildReceiptData(
  workspaceId: string,
  transactionId: string,
): Promise<ReceiptData> {
  const trxRows = await db
    .select({ t: transactions, cashierName: cashiers.name })
    .from(transactions)
    .innerJoin(cashiers, eq(cashiers.id, transactions.cashierId))
    .where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)))
    .limit(1)
  const trxRow = trxRows[0]
  if (!trxRow) throw new Error('Transaksi tidak ditemukan')
  const trx = trxRow.t

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, transactionId))

  const payments = await db
    .select()
    .from(transactionPayments)
    .where(eq(transactionPayments.transactionId, transactionId))

  const outlet = (
    await db.select().from(outlets).where(eq(outlets.id, trx.outletId)).limit(1)
  )[0]
  const ws = (
    await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  )[0]

  const showAddress = ws?.receiptShowAddress ?? true
  const showCashier = ws?.receiptShowCashier ?? true
  const showTrxNo = ws?.receiptShowTrxNo ?? true
  const note = ws?.receiptNote?.trim() || undefined

  const receiptItems: ReceiptItem[] = items.map((it) => {
    const mods = (Array.isArray(it.modifiers) ? it.modifiers : []) as ItemModifier[]
    const modNames = mods
      .flatMap((m) => (m.options ?? []).map((o) => o.name))
      .filter((n): n is string => Boolean(n))
    const name = modNames.length ? `${it.productName} (${modNames.join(', ')})` : it.productName
    return {
      name,
      qty: it.quantity,
      price: Number(it.priceUnit) + Number(it.modifierTotal),
      subtotal: Number(it.subtotal),
    }
  })

  // Payment: single method, or summarised "campuran" for splits.
  let paymentMethod: string
  let amountPaid: number
  if (payments.length > 1) {
    paymentMethod = 'Pembayaran Campuran'
    amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  } else if (payments.length === 1) {
    paymentMethod = getPaymentMethodLabel(payments[0].method)
    amountPaid = Number(payments[0].amount)
  } else {
    paymentMethod = getPaymentMethodLabel(trx.paymentMethod)
    amountPaid = Number(trx.paymentAmount)
  }

  return {
    storeName: ws?.name ?? 'TOKO',
    storeAddress: showAddress ? outlet?.address ?? undefined : undefined,
    // Empty string when hidden by setting; native ESC/POS builder skips empty lines.
    cashierName: showCashier ? trxRow.cashierName : '',
    transactionNo: showTrxNo ? trx.trxNumber : '',
    datetime: fmtDate(new Date(trx.trxDate)),
    items: receiptItems,
    subtotal: Number(trx.subtotal),
    discount: Number(trx.discount) || undefined,
    total: Number(trx.total),
    paymentMethod,
    amountPaid,
    change: Number(trx.changeAmount) || undefined,
    customerName: trx.customerName ?? undefined,
    footer: note,
  }
}
