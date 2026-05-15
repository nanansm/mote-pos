import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  cashiers,
  customers,
  customerDebts,
  productGroups,
  products,
  shiftSessions,
  transactionItems,
  transactionPayments,
  transactions,
  workspaces,
} from '../db/schema'
import {
  ensureTabs,
  errorMessage,
  writeRowsToSheet,
} from './index'

export const TABS = ['Transaksi', 'Items', 'Pelanggan', 'Hutang', 'Produk', 'Shift'] as const

function fmtDateID(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12: false,
  })
}

export type SyncResult =
  | { ok: true; tabsCount: number }
  | { ok: false; error: string }

export async function syncWorkspaceToSheets(workspaceId: string): Promise<SyncResult> {
  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  const ws = wsRows[0]
  if (!ws) return { ok: false, error: 'workspace not found' }
  if (!ws.sheetsSyncEnabled) return { ok: false, error: 'Sheets sync belum diaktifkan' }
  if (!ws.sheetsSyncId) return { ok: false, error: 'Sheet ID belum diset' }

  const sheetId = ws.sheetsSyncId
  try {
    await ensureTabs(sheetId, [...TABS])

    // === Tab: Transaksi ===
    const trxRows = await db
      .select({
        trxNumber: transactions.trxNumber,
        trxDate: transactions.trxDate,
        cashierName: cashiers.name,
        subtotal: transactions.subtotal,
        discount: transactions.discount,
        total: transactions.total,
        paymentMethod: transactions.paymentMethod,
        customerName: transactions.customerName,
        customerPhone: transactions.customerPhone,
        status: transactions.status,
      })
      .from(transactions)
      .leftJoin(cashiers, eq(cashiers.id, transactions.cashierId))
      .where(eq(transactions.workspaceId, workspaceId))
      .orderBy(desc(transactions.trxDate))
    await writeRowsToSheet(
      sheetId,
      'Transaksi',
      trxRows.map((t) => [
        t.trxNumber,
        fmtDateID(t.trxDate),
        t.cashierName ?? '',
        Number(t.subtotal),
        Number(t.discount),
        Number(t.total),
        t.paymentMethod,
        t.customerName ?? '',
        t.customerPhone ?? '',
        t.status,
      ]),
      {
        mode: 'replace',
        headerRow: [
          'No. TRX',
          'Tanggal',
          'Kasir',
          'Subtotal',
          'Diskon',
          'Total',
          'Metode Bayar',
          'Pelanggan',
          'HP Pelanggan',
          'Status',
        ],
      },
    )

    // === Tab: Items ===
    const itemRows = await db
      .select({
        trxNumber: transactions.trxNumber,
        trxDate: transactions.trxDate,
        productName: transactionItems.productName,
        quantity: transactionItems.quantity,
        priceUnit: transactionItems.priceUnit,
        discount: transactionItems.discount,
        subtotal: transactionItems.subtotal,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactions.id, transactionItems.transactionId))
      .where(eq(transactions.workspaceId, workspaceId))
      .orderBy(desc(transactions.trxDate))
    await writeRowsToSheet(
      sheetId,
      'Items',
      itemRows.map((it) => [
        it.trxNumber,
        fmtDateID(it.trxDate),
        it.productName,
        it.quantity,
        Number(it.priceUnit),
        Number(it.discount),
        Number(it.subtotal),
      ]),
      {
        mode: 'replace',
        headerRow: ['No. TRX', 'Tanggal', 'Produk', 'Qty', 'Harga Satuan', 'Diskon', 'Subtotal'],
      },
    )

    // === Tab: Pelanggan ===
    const custRows = await db
      .select({
        name: customers.name,
        phone: customers.phone,
        totalPurchases: customers.totalPurchases,
        totalDebt: customers.totalDebt,
        createdAt: customers.createdAt,
        notes: customers.notes,
      })
      .from(customers)
      .where(eq(customers.workspaceId, workspaceId))
      .orderBy(desc(customers.updatedAt))
    await writeRowsToSheet(
      sheetId,
      'Pelanggan',
      custRows.map((c) => [
        c.name,
        c.phone ?? '',
        c.totalPurchases,
        c.totalDebt,
        fmtDateID(c.createdAt),
        c.notes ?? '',
      ]),
      {
        mode: 'replace',
        headerRow: ['Nama', 'HP', 'Total Belanja', 'Hutang Outstanding', 'Bergabung', 'Catatan'],
      },
    )

    // === Tab: Hutang ===
    const debtRows = await db
      .select({
        createdAt: customerDebts.createdAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        amount: customerDebts.amount,
        paidAmount: customerDebts.paidAmount,
        status: customerDebts.status,
        notes: customerDebts.notes,
      })
      .from(customerDebts)
      .innerJoin(customers, eq(customers.id, customerDebts.customerId))
      .where(eq(customerDebts.workspaceId, workspaceId))
      .orderBy(desc(customerDebts.createdAt))
    await writeRowsToSheet(
      sheetId,
      'Hutang',
      debtRows.map((d) => [
        fmtDateID(d.createdAt),
        d.customerName,
        d.customerPhone ?? '',
        d.amount,
        d.paidAmount,
        d.amount - d.paidAmount,
        d.status,
        d.notes ?? '',
      ]),
      {
        mode: 'replace',
        headerRow: ['Tanggal', 'Pelanggan', 'HP', 'Hutang', 'Sudah Bayar', 'Sisa', 'Status', 'Catatan'],
      },
    )

    // === Tab: Produk (with variant) ===
    const prodRows = await db
      .select({
        groupName: productGroups.name,
        variantName: products.variantName,
        sku: products.sku,
        barcode: products.barcode,
        priceSell: products.priceSell,
        priceCost: products.priceCost,
        unit: products.unit,
        stockTrack: products.stockTrack,
        stockCurrent: products.stockCurrent,
        isActive: products.isActive,
      })
      .from(products)
      .innerJoin(productGroups, eq(productGroups.id, products.groupId))
      .where(eq(products.workspaceId, workspaceId))
    await writeRowsToSheet(
      sheetId,
      'Produk',
      prodRows.map((p) => [
        p.groupName,
        p.variantName ?? '',
        p.sku ?? '',
        p.barcode ?? '',
        Number(p.priceSell),
        p.priceCost != null ? Number(p.priceCost) : '',
        p.unit,
        p.stockTrack ? p.stockCurrent : '',
        p.isActive ? 'Ya' : 'Tidak',
      ]),
      {
        mode: 'replace',
        headerRow: [
          'Produk',
          'Variant',
          'SKU',
          'Barcode',
          'Harga Jual',
          'Harga Modal',
          'Satuan',
          'Stok',
          'Aktif',
        ],
      },
    )

    // === Tab: Shift ===
    const shiftRows = await db
      .select({
        openedAt: shiftSessions.openedAt,
        closedAt: shiftSessions.closedAt,
        cashierName: cashiers.name,
        openingBalance: shiftSessions.openingBalance,
        closingBalance: shiftSessions.closingBalance,
        expectedBalance: shiftSessions.expectedBalance,
        difference: shiftSessions.difference,
        status: shiftSessions.status,
        notes: shiftSessions.notes,
      })
      .from(shiftSessions)
      .innerJoin(cashiers, eq(cashiers.id, shiftSessions.cashierId))
      .where(eq(shiftSessions.workspaceId, workspaceId))
      .orderBy(desc(shiftSessions.openedAt))
    await writeRowsToSheet(
      sheetId,
      'Shift',
      shiftRows.map((s) => [
        fmtDateID(s.openedAt),
        fmtDateID(s.closedAt),
        s.cashierName,
        Number(s.openingBalance),
        s.closingBalance != null ? Number(s.closingBalance) : '',
        s.expectedBalance != null ? Number(s.expectedBalance) : '',
        s.difference != null ? Number(s.difference) : '',
        s.status,
        s.notes ?? '',
      ]),
      {
        mode: 'replace',
        headerRow: [
          'Buka',
          'Tutup',
          'Kasir',
          'Saldo Awal',
          'Saldo Akhir',
          'Expected',
          'Selisih',
          'Status',
          'Catatan',
        ],
      },
    )

    await db
      .update(workspaces)
      .set({
        sheetsLastSyncAt: new Date(),
        sheetsLastSyncStatus: 'success',
        sheetsLastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))

    return { ok: true, tabsCount: TABS.length }
  } catch (err) {
    const msg = errorMessage(err)
    await db
      .update(workspaces)
      .set({
        sheetsLastSyncAt: new Date(),
        sheetsLastSyncStatus: 'failed',
        sheetsLastSyncError: msg.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
    return { ok: false, error: msg }
  }
}

void transactionPayments
