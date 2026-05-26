import { EscPosBuilder, rightAlignTwoColumns } from './escpos'
import { getPaymentMethodLabel } from '../payment-methods/labels'

const WIDTH = 32 // 58mm = ~32 chars; 80mm = 48

function formatRupiahShort(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

function formatDateTime(d: Date): string {
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

export type ReceiptModifier = {
  name: string
  options: { name: string; priceAdd: number }[]
}

export type ReceiptItem = {
  name: string
  qty: number
  priceUnit: number
  modifierTotal: number
  modifiers: ReceiptModifier[]
  subtotal: number
}

export type ReceiptInput = {
  workspace: { name: string; address?: string | null; phone?: string | null }
  trx: {
    trxNumber: string
    trxDate: Date
    cashierName: string
    paymentMethod: string
    paymentAmount: number
    changeAmount: number
    subtotal: number
    discount: number
    total: number
    customerName?: string | null
    notes?: string | null
  }
  items: ReceiptItem[]
  footer?: string
  showCashier?: boolean
  showTrxNo?: boolean
}

export function buildReceiptCommands(data: ReceiptInput): Buffer {
  const b = new EscPosBuilder()
  b.init()

  // Header
  b.alignCenter().boldOn().doubleHeightOn().line(data.workspace.name.toUpperCase())
  b.doubleHeightOff().boldOff()
  if (data.workspace.address) b.line(truncate(data.workspace.address, WIDTH))
  if (data.workspace.phone) b.line(`Telp: ${data.workspace.phone}`)
  b.feed(1)

  b.alignLeft()
  if (data.showTrxNo !== false) b.line(`No: ${data.trx.trxNumber}`)
  b.line(`Tgl: ${formatDateTime(data.trx.trxDate)}`)
  if (data.showCashier !== false) b.line(`Kasir: ${data.trx.cashierName}`)
  if (data.trx.customerName) b.line(`Cust: ${data.trx.customerName}`)
  b.line('-'.repeat(WIDTH))

  for (const item of data.items) {
    const header = `${item.name}`.slice(0, WIDTH - 6) + `  ${item.qty}x`
    b.line(header)
    if (item.modifiers.length) {
      for (const m of item.modifiers) {
        for (const o of m.options) {
          const add = o.priceAdd ? ` +${formatRupiahShort(o.priceAdd)}` : ''
          b.line(`  + ${o.name}${add}`)
        }
      }
    }
    const unit = item.priceUnit
    const sub = item.subtotal
    if (item.modifierTotal > 0) {
      b.line(
        rightAlignTwoColumns(
          `  ${formatRupiahShort(unit)} + ${formatRupiahShort(item.modifierTotal)}`,
          formatRupiahShort(sub),
          WIDTH,
        ),
      )
    } else {
      b.line(rightAlignTwoColumns(`  ${formatRupiahShort(unit)}`, formatRupiahShort(sub), WIDTH))
    }
  }

  b.line('-'.repeat(WIDTH))
  b.line(rightAlignTwoColumns('Subtotal', `Rp ${formatRupiahShort(data.trx.subtotal)}`, WIDTH))
  if (data.trx.discount > 0) {
    b.line(rightAlignTwoColumns('Diskon', `- ${formatRupiahShort(data.trx.discount)}`, WIDTH))
  }
  b.boldOn()
  b.line(rightAlignTwoColumns('Total', `Rp ${formatRupiahShort(data.trx.total)}`, WIDTH))
  b.boldOff()
  b.feed(1)
  b.line(
    rightAlignTwoColumns(
      getPaymentMethodLabel(data.trx.paymentMethod),
      `Rp ${formatRupiahShort(data.trx.paymentAmount)}`,
      WIDTH,
    ),
  )
  if (data.trx.changeAmount > 0) {
    b.line(rightAlignTwoColumns('Kembalian', `Rp ${formatRupiahShort(data.trx.changeAmount)}`, WIDTH))
  }
  if (data.trx.notes) {
    b.feed(1).line('Catatan:').line(truncate(data.trx.notes, WIDTH))
  }

  b.feed(1)
  b.alignCenter()
  b.line(data.footer ?? 'Terima kasih')
  b.line('pos.motekreatif.com')
  b.feed(3)
  b.cut()
  return b.toBuffer()
}

export type ShiftReportInput = {
  workspace: { name: string }
  outlet: { name: string }
  cashierName: string
  openedAt: Date
  closedAt: Date
  trxCount: number
  total: number
  byMethod: { cash: number; qris: number; transfer: number }
  openingBalance: number
  expectedBalance: number
  actualBalance: number
  difference: number
  notes?: string | null
}

export function buildShiftReportCommands(data: ShiftReportInput): Buffer {
  const b = new EscPosBuilder()
  b.init()
  b.alignCenter().boldOn().doubleHeightOn().line('TUTUP SHIFT')
  b.doubleHeightOff().boldOff()
  b.feed(1)
  b.alignLeft()
  b.line(`Toko: ${data.workspace.name}`)
  b.line(`Outlet: ${data.outlet.name}`)
  b.line(`Kasir: ${data.cashierName}`)
  b.line(`Buka:  ${formatDateTime(data.openedAt)}`)
  b.line(`Tutup: ${formatDateTime(data.closedAt)}`)
  b.line('-'.repeat(WIDTH))
  b.line(rightAlignTwoColumns('Transaksi', String(data.trxCount), WIDTH))
  b.boldOn()
  b.line(rightAlignTwoColumns('Total', `Rp ${formatRupiahShort(data.total)}`, WIDTH))
  b.boldOff()
  b.feed(1)
  b.line(rightAlignTwoColumns('CASH', `Rp ${formatRupiahShort(data.byMethod.cash)}`, WIDTH))
  b.line(rightAlignTwoColumns('QRIS', `Rp ${formatRupiahShort(data.byMethod.qris)}`, WIDTH))
  b.line(rightAlignTwoColumns('TRF', `Rp ${formatRupiahShort(data.byMethod.transfer)}`, WIDTH))
  b.line('-'.repeat(WIDTH))
  b.line(rightAlignTwoColumns('Saldo Awal', `Rp ${formatRupiahShort(data.openingBalance)}`, WIDTH))
  b.line(rightAlignTwoColumns('Expected', `Rp ${formatRupiahShort(data.expectedBalance)}`, WIDTH))
  b.line(rightAlignTwoColumns('Actual', `Rp ${formatRupiahShort(data.actualBalance)}`, WIDTH))
  const diffSign = data.difference >= 0 ? '+' : '-'
  b.boldOn()
  b.line(
    rightAlignTwoColumns(
      'Selisih',
      `${diffSign}Rp ${formatRupiahShort(Math.abs(data.difference))}`,
      WIDTH,
    ),
  )
  b.boldOff()
  if (data.notes) {
    b.feed(1).line('Catatan:').line(truncate(data.notes, WIDTH))
  }
  b.feed(2)
  b.alignCenter().line('Ditandatangani:').feed(2).line('______________________')
  b.feed(3)
  b.cut()
  return b.toBuffer()
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}
