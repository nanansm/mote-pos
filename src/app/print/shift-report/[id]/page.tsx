import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  cashiers,
  outlets,
  shiftSessions,
  workspaces,
} from '@/lib/db/schema'
import { getCurrentContext } from '@/lib/session'
import { getShiftPaymentSummary } from '@/lib/shifts/summary'
import { AutoPrint } from '../../auto-print'

export const dynamic = 'force-dynamic'

function fmtRupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))
}
function fmtDateTime(d: Date) {
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

export default async function PrintShiftReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getCurrentContext()
  if (!ctx?.workspace) redirect('/sign-in')

  const rows = await db
    .select({ s: shiftSessions, cashier: cashiers.name })
    .from(shiftSessions)
    .innerJoin(cashiers, eq(cashiers.id, shiftSessions.cashierId))
    .where(
      and(
        eq(shiftSessions.id, id),
        eq(shiftSessions.workspaceId, ctx.workspace.id),
      ),
    )
    .limit(1)
  const r = rows[0]
  if (!r) {
    return (
      <div className="print-receipt">
        <p className="center">Shift tidak ditemukan.</p>
      </div>
    )
  }
  const ws = (await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspace.id)).limit(1))[0]
  const outlet = (await db.select().from(outlets).where(eq(outlets.id, r.s.outletId)).limit(1))[0]

  const summary = await getShiftPaymentSummary(id, ctx.workspace.id)
  const total = summary.total
  const opening = Number(r.s.openingBalance)
  const expected = Number(r.s.expectedBalance ?? opening + summary.cashIn)
  const actual = Number(r.s.closingBalance ?? expected)
  const diff = Number(r.s.difference ?? actual - expected)

  return (
    <>
      <AutoPrint />
      <div className="print-receipt">
        <div className="center bold xl">TUTUP SHIFT</div>
        <hr className="divider" />
        <div className="small">Toko: {ws?.name ?? '—'}</div>
        <div className="small">Outlet: {outlet?.name ?? '—'}</div>
        <div className="small">Kasir: {r.cashier}</div>
        <div className="small">Buka: {fmtDateTime(new Date(r.s.openedAt))}</div>
        <div className="small">
          Tutup: {r.s.closedAt ? fmtDateTime(new Date(r.s.closedAt)) : '—'}
        </div>
        <hr className="divider" />
        <div className="row">
          <span>Transaksi</span>
          <span>{summary.txCount}</span>
        </div>
        <div className="row bold lg">
          <span>Total</span>
          <span>{fmtRupiah(total)}</span>
        </div>

        <hr className="divider" />
        {summary.breakdown.map((item) => (
          <div className="row" key={item.method}>
            <span>{item.label.toUpperCase()}</span>
            <span>{fmtRupiah(item.amount)}</span>
          </div>
        ))}

        <hr className="divider" />
        <div className="row">
          <span>Saldo Awal</span>
          <span>{fmtRupiah(opening)}</span>
        </div>
        <div className="row">
          <span>Expected</span>
          <span>{fmtRupiah(expected)}</span>
        </div>
        <div className="row">
          <span>Actual</span>
          <span>{fmtRupiah(actual)}</span>
        </div>
        <div className="row bold">
          <span>Selisih</span>
          <span>
            {diff >= 0 ? '+' : '-'}
            {fmtRupiah(Math.abs(diff))}
          </span>
        </div>

        {r.s.notes && (
          <>
            <hr className="divider" />
            <div className="small">Catatan: {r.s.notes}</div>
          </>
        )}

        <hr className="divider" />
        <div className="center small" style={{ marginTop: '4mm' }}>
          Ditandatangani:
        </div>
        <div className="center" style={{ marginTop: '8mm' }}>
          ______________________
        </div>
        <hr className="divider" />
        <div className="center small muted">Dicetak {fmtDateTime(new Date())}</div>
      </div>
    </>
  )
}
