import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  cashiers,
  customers,
  customerDebts,
  outlets,
  transactionItems,
  transactionPayments,
  transactions,
  workspaces,
} from '@/lib/db/schema'
import { getCurrentContext } from '@/lib/session'
import { getPaymentMethodLabel } from '@/lib/payment-methods/labels'
import { AutoPrint } from '../../auto-print'

export const dynamic = 'force-dynamic'

function fmtRupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))
}

function fmtDate(d: Date) {
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

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getCurrentContext()
  if (!ctx?.workspace) redirect('/sign-in')

  const trxRows = await db
    .select({ t: transactions, cashierName: cashiers.name })
    .from(transactions)
    .innerJoin(cashiers, eq(cashiers.id, transactions.cashierId))
    .where(and(eq(transactions.id, id), eq(transactions.workspaceId, ctx.workspace.id)))
    .limit(1)
  const trxRow = trxRows[0]
  if (!trxRow) {
    return (
      <div className="print-receipt no-print">
        <p className="center">Transaksi tidak ditemukan.</p>
      </div>
    )
  }

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id))

  const payments = await db
    .select()
    .from(transactionPayments)
    .where(eq(transactionPayments.transactionId, id))

  const outletRows = await db
    .select()
    .from(outlets)
    .where(eq(outlets.id, trxRow.t.outletId))
    .limit(1)
  const outlet = outletRows[0]
  const ws = (
    await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspace.id)).limit(1)
  )[0]

  let totalDebtCustomer = 0
  if (trxRow.t.customerId) {
    const c = await db
      .select({ totalDebt: customers.totalDebt })
      .from(customers)
      .where(eq(customers.id, trxRow.t.customerId))
      .limit(1)
    totalDebtCustomer = Number(c[0]?.totalDebt ?? 0)
    // Note: this is current outstanding (after this trx debt added if any).
    void customerDebts
  }

  const trx = trxRow.t
  const cashierName = trxRow.cashierName
  const subtotal = Number(trx.subtotal)
  const discount = Number(trx.discount)
  const total = Number(trx.total)
  const change = Number(trx.changeAmount)
  const debtPaid = payments
    .filter((p) => p.method === 'debt')
    .reduce((s, p) => s + Number(p.amount), 0)
  const isVoid = trx.status === 'voided'
  const isPartial = trx.status === 'partial_refund'
  const isRefund = trx.status === 'refunded'

  const paperSize = ws?.receiptPaperSize ?? '80mm'
  const showAddress = ws?.receiptShowAddress ?? true
  const showPhone = ws?.receiptShowPhone ?? true
  const showCashier = ws?.receiptShowCashier ?? true
  const showTrxNo = ws?.receiptShowTrxNo ?? true
  const note = ws?.receiptNote?.trim() ?? ''

  return (
    <>
      <AutoPrint />
      <style dangerouslySetInnerHTML={{ __html: paperSize === '58mm' ? '@page { size: 58mm auto; margin: 0; }' : '' }} />
      <div className="print-receipt" data-size={paperSize}>
        <div className="center bold xl">{ws?.name?.toUpperCase() ?? 'TOKO'}</div>
        {showAddress && outlet?.address && <div className="center small">{outlet.address}</div>}
        {showPhone && ws?.phone && <div className="center small">Telp: {ws.phone}</div>}
        <hr className="divider" />

        {showTrxNo && (
          <div className="row small">
            <span>No</span>
            <span className="bold">{trx.trxNumber}</span>
          </div>
        )}
        <div className="row small">
          <span>Tgl</span>
          <span>{fmtDate(new Date(trx.trxDate))}</span>
        </div>
        {showCashier && (
          <div className="row small">
            <span>Kasir</span>
            <span>{cashierName}</span>
          </div>
        )}
        {trx.customerName && (
          <div className="row small">
            <span>Pelanggan</span>
            <span>
              {trx.customerName}
              {trx.customerPhone ? ` (${trx.customerPhone})` : ''}
            </span>
          </div>
        )}
        <hr className="divider" />

        {items.map((it) => {
          const gross = Number(it.priceUnit) * it.quantity + Number(it.modifierTotal) * it.quantity
          const sub = Number(it.subtotal)
          const disc = Number(it.discount)
          const mods = (Array.isArray(it.modifiers) ? it.modifiers : []) as Array<{
            name?: string
            options?: Array<{ name?: string; priceAdd?: number }>
          }>
          return (
            <div key={it.id} style={{ marginBottom: '1.5mm' }}>
              <div className="row">
                <span className="bold">{it.productName}</span>
                <span>×{it.quantity}</span>
              </div>
              {mods.map((m, i) =>
                (m.options ?? []).map((o, j) => (
                  <div key={`${i}-${j}`} className="small muted">
                    + {o.name}
                    {o.priceAdd ? ` (${fmtRupiah(Number(o.priceAdd))})` : ''}
                  </div>
                )),
              )}
              <div className="item-row small">
                <span className="muted">
                  @ {fmtRupiah(Number(it.priceUnit) + Number(it.modifierTotal))}
                </span>
                <span>{fmtRupiah(gross)}</span>
              </div>
              {disc > 0 && (
                <div className="item-row small">
                  <span className="muted">
                    Diskon {it.discountType === 'percent' ? `${disc}%` : ''}
                  </span>
                  <span>- {fmtRupiah(gross - sub)}</span>
                </div>
              )}
            </div>
          )
        })}

        <hr className="divider" />
        <div className="row">
          <span>Subtotal</span>
          <span>{fmtRupiah(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="row">
            <span>Diskon Total</span>
            <span>- {fmtRupiah(discount)}</span>
          </div>
        )}
        <div className="row bold lg">
          <span>TOTAL</span>
          <span>{fmtRupiah(total)}</span>
        </div>

        <hr className="divider" />
        {payments.length === 0 ? (
          <div className="row">
            <span>{getPaymentMethodLabel(trx.paymentMethod)}</span>
            <span>{fmtRupiah(Number(trx.paymentAmount))}</span>
          </div>
        ) : (
          payments.map((p) => (
            <div key={p.id} className="row">
              <span>{getPaymentMethodLabel(p.method)}</span>
              <span>{fmtRupiah(Number(p.amount))}</span>
            </div>
          ))
        )}
        {change > 0 && (
          <div className="row">
            <span>Kembalian</span>
            <span>{fmtRupiah(change)}</span>
          </div>
        )}

        {debtPaid > 0 && (
          <>
            <hr className="divider" />
            <div className="center bold">==== HUTANG ====</div>
            <div className="row">
              <span>Hutang ini</span>
              <span>{fmtRupiah(debtPaid)}</span>
            </div>
            {trx.customerName && (
              <>
                <div className="row">
                  <span>Total hutang</span>
                  <span>{fmtRupiah(totalDebtCustomer)}</span>
                </div>
                <div className="small muted">
                  Customer: {trx.customerName}
                  {trx.customerPhone ? ` (${trx.customerPhone})` : ''}
                </div>
              </>
            )}
          </>
        )}

        {trx.notes && (
          <>
            <hr className="divider" />
            <div className="small">Catatan: {trx.notes}</div>
          </>
        )}

        {(isVoid || isRefund || isPartial) && (
          <>
            <hr className="divider" />
            <div className="center bold">
              ** {isVoid ? 'TRANSAKSI VOIDED' : isPartial ? 'PARTIAL REFUND' : 'REFUNDED'} **
            </div>
            {trx.voidReason && <div className="center small">{trx.voidReason}</div>}
          </>
        )}

        {trx.pickupStatus === 'pickup_pending' && (
          <>
            <hr className="divider" />
            <div className="center bold">*** BARANG BELUM DIAMBIL ***</div>
            <div className="center small">Tunjukkan struk saat ambil</div>
            {trx.pickupNotes && (
              <div className="center small">Catatan: {trx.pickupNotes}</div>
            )}
          </>
        )}
        {trx.pickupStatus === 'pickup_completed' && trx.pickupAt && (
          <>
            <hr className="divider" />
            <div className="center small">
              ✓ Sudah Diambil{' '}
              {new Date(trx.pickupAt).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </div>
          </>
        )}

        <hr className="divider" />
        <div className="center small bold">Terima kasih</div>
        {note && (
          <div
            className="center small"
            style={{ whiteSpace: 'pre-wrap', marginTop: '1.5mm' }}
          >
            {note}
          </div>
        )}
      </div>
    </>
  )
}
