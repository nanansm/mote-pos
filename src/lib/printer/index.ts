import net from 'node:net'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  cashiers,
  outlets,
  shiftSessions,
  transactionItems,
  transactions,
  workspaces,
} from '../db/schema'
import {
  buildReceiptCommands,
  buildShiftReportCommands,
  type ReceiptModifier,
} from './template'

const PRINT_TIMEOUT_MS = 5000

export async function sendToPrinter(
  ip: string,
  port: number,
  buf: Buffer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      try {
        socket.destroy()
      } catch {
        // ignore
      }
      if (err) reject(err)
      else resolve()
    }
    socket.setTimeout(PRINT_TIMEOUT_MS, () => finish(new Error('printer timeout')))
    socket.on('error', (err) => finish(err))
    socket.connect(port, ip, () => {
      socket.write(buf, (err) => {
        if (err) return finish(err)
        // small grace period for buffer drain then close
        socket.end()
      })
    })
    socket.on('close', () => finish())
  })
}

export async function printReceipt(workspaceId: string, transactionId: string) {
  const trxRows = await db
    .select({ t: transactions, cashierName: cashiers.name })
    .from(transactions)
    .innerJoin(cashiers, eq(cashiers.id, transactions.cashierId))
    .where(and(eq(transactions.id, transactionId), eq(transactions.workspaceId, workspaceId)))
    .limit(1)
  const trxRow = trxRows[0]
  if (!trxRow) throw new Error('transaction not found')

  const outletRows = await db
    .select()
    .from(outlets)
    .where(eq(outlets.id, trxRow.t.outletId))
    .limit(1)
  const outlet = outletRows[0]
  if (!outlet) throw new Error('outlet not found')
  if (!outlet.printerIp) throw new Error('Printer IP belum diset di pengaturan outlet')

  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  const ws = wsRows[0]
  if (!ws) throw new Error('workspace not found')

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, transactionId))

  const buf = buildReceiptCommands({
    workspace: { name: ws.name, address: outlet.address ?? ws.address, phone: ws.phone ?? null },
    trx: {
      trxNumber: trxRow.t.trxNumber,
      trxDate: new Date(trxRow.t.trxDate),
      cashierName: trxRow.cashierName,
      paymentMethod: trxRow.t.paymentMethod,
      paymentAmount: Number(trxRow.t.paymentAmount),
      changeAmount: Number(trxRow.t.changeAmount),
      subtotal: Number(trxRow.t.subtotal),
      discount: Number(trxRow.t.discount),
      total: Number(trxRow.t.total),
      customerName: trxRow.t.customerName ?? null,
      notes: trxRow.t.notes ?? null,
    },
    items: items.map((i) => ({
      name: i.productName,
      qty: i.quantity,
      priceUnit: Number(i.priceUnit),
      modifierTotal: Number(i.modifierTotal),
      modifiers: (Array.isArray(i.modifiers) ? i.modifiers : []) as ReceiptModifier[],
      subtotal: Number(i.subtotal),
    })),
    showCashier: ws.receiptShowCashier,
    showTrxNo: ws.receiptShowTrxNo,
  })

  await sendToPrinter(outlet.printerIp, outlet.printerPort, buf)
}

export async function printShiftReport(workspaceId: string, shiftId: string) {
  const shiftRows = await db
    .select({ s: shiftSessions, cashierName: cashiers.name })
    .from(shiftSessions)
    .innerJoin(cashiers, eq(cashiers.id, shiftSessions.cashierId))
    .where(and(eq(shiftSessions.id, shiftId), eq(shiftSessions.workspaceId, workspaceId)))
    .limit(1)
  const shiftRow = shiftRows[0]
  if (!shiftRow) throw new Error('shift not found')

  const outletRows = await db
    .select()
    .from(outlets)
    .where(eq(outlets.id, shiftRow.s.outletId))
    .limit(1)
  const outlet = outletRows[0]
  if (!outlet) throw new Error('outlet not found')
  if (!outlet.printerIp) throw new Error('Printer IP belum diset di pengaturan outlet')

  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  const ws = wsRows[0]
  if (!ws) throw new Error('workspace not found')

  const trxRows = await db
    .select({ paymentMethod: transactions.paymentMethod, total: transactions.total })
    .from(transactions)
    .where(
      and(eq(transactions.shiftId, shiftId), eq(transactions.status, 'completed')),
    )
  const total = trxRows.reduce((acc, t) => acc + Number(t.total), 0)
  const byMethod: { cash: number; qris: number; transfer: number } = { cash: 0, qris: 0, transfer: 0 }
  for (const t of trxRows) {
    if (t.paymentMethod === 'cash' || t.paymentMethod === 'qris' || t.paymentMethod === 'transfer') {
      byMethod[t.paymentMethod] += Number(t.total)
    }
  }

  const openingBalance = Number(shiftRow.s.openingBalance ?? 0)
  const expectedBalance = Number(shiftRow.s.expectedBalance ?? openingBalance + byMethod.cash)
  const actualBalance = Number(shiftRow.s.closingBalance ?? expectedBalance)
  const difference = Number(shiftRow.s.difference ?? actualBalance - expectedBalance)

  const buf = buildShiftReportCommands({
    workspace: { name: ws.name },
    outlet: { name: outlet.name },
    cashierName: shiftRow.cashierName,
    openedAt: new Date(shiftRow.s.openedAt),
    closedAt: new Date(shiftRow.s.closedAt ?? new Date()),
    trxCount: trxRows.length,
    total,
    byMethod,
    openingBalance,
    expectedBalance,
    actualBalance,
    difference,
    notes: shiftRow.s.notes ?? null,
  })

  await sendToPrinter(outlet.printerIp, outlet.printerPort, buf)
}
