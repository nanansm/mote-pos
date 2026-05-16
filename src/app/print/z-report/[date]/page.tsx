import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces, outlets } from '@/lib/db/schema'
import { getCurrentContext } from '@/lib/session'
import { env } from '@/lib/env'
import { getPaymentMethodLabel } from '@/lib/payment-methods/labels'
import { AutoPrint } from '../../auto-print'

export const dynamic = 'force-dynamic'

type Resp = {
  date: string
  summary: { transactionCount: number; totalSales: number }
  byMethod: { method: string; total: number; count: number }[]
  byCategory: { name: string; total: number }[]
  byCashier: { name: string; total: number }[]
  adjustments: {
    refundCount: number
    refundTotal: number
    voidCount: number
    voidTotal: number
    discountTotal: number
  }
}

function fmtRupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))
}
function fmtPct(n: number) {
  return n.toFixed(1) + '%'
}

export default async function PrintZReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ctx = await getCurrentContext()
  if (!ctx?.workspace) redirect('/sign-in')
  const { date } = await params
  await searchParams // unused

  const ws = (
    await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspace.id)).limit(1)
  )[0]
  const outletRows = await db
    .select()
    .from(outlets)
    .where(eq(outlets.workspaceId, ctx.workspace.id))
    .limit(1)
  const outlet = outletRows[0]

  // Server-side fetch to avoid auth issue
  const url = new URL(
    `${env.BETTER_AUTH_URL || 'http://localhost:3030'}/api/reports/z-report?date=${date}`,
  )
  let data: Resp | null = null
  try {
    // Use direct DB instead of fetch for simplicity
    const mod = await import('@/app/api/reports/z-report/route')
    const fakeReq = new Request(url.toString(), { method: 'GET' })
    const res = await (mod as unknown as { GET: (req: Request) => Promise<Response> }).GET(fakeReq)
    data = (await res.json()) as Resp
  } catch {
    data = null
  }
  if (!data) {
    return (
      <div className="print-receipt">
        <p className="center">Gagal load data Z-Report.</p>
      </div>
    )
  }

  const totalMethod = data.byMethod.reduce((s, m) => s + m.total, 0)

  return (
    <>
      <AutoPrint />
      <div className="print-receipt">
        <div className="center bold xl">{ws?.name?.toUpperCase() ?? 'TOKO'}</div>
        <div className="center bold">Z-REPORT HARIAN</div>
        <div className="center small">
          Outlet: {outlet?.name ?? '—'} • {data.date}
        </div>
        <hr className="divider" />

        <div className="row bold lg">
          <span>Total Penjualan</span>
          <span>{fmtRupiah(data.summary.totalSales)}</span>
        </div>
        <div className="row">
          <span>Jumlah Transaksi</span>
          <span>{data.summary.transactionCount}</span>
        </div>

        <hr className="divider" />
        <div className="bold small">--- METODE BAYAR ---</div>
        {data.byMethod.length === 0 ? (
          <div className="small muted">Tidak ada pembayaran.</div>
        ) : (
          data.byMethod.map((m) => {
            const pct = totalMethod > 0 ? (m.total / totalMethod) * 100 : 0
            return (
              <div key={m.method} className="row small">
                <span>
                  {getPaymentMethodLabel(m.method).padEnd(10, ' ')}
                </span>
                <span>
                  {fmtRupiah(m.total)} ({fmtPct(pct)})
                </span>
              </div>
            )
          })
        )}

        <hr className="divider" />
        <div className="bold small">--- KATEGORI ---</div>
        {data.byCategory.length === 0 ? (
          <div className="small muted">Tidak ada data.</div>
        ) : (
          data.byCategory.map((c) => (
            <div key={c.name} className="row small">
              <span>{c.name}</span>
              <span>{fmtRupiah(c.total)}</span>
            </div>
          ))
        )}

        <hr className="divider" />
        <div className="bold small">--- PER KASIR ---</div>
        {data.byCashier.length === 0 ? (
          <div className="small muted">Tidak ada data.</div>
        ) : (
          data.byCashier.map((c) => (
            <div key={c.name} className="row small">
              <span>{c.name}</span>
              <span>{fmtRupiah(c.total)}</span>
            </div>
          ))
        )}

        <hr className="divider" />
        <div className="bold small">--- ADJUSTMENTS ---</div>
        <div className="row small">
          <span>Refund</span>
          <span>
            {fmtRupiah(data.adjustments.refundTotal)} ({data.adjustments.refundCount}x)
          </span>
        </div>
        <div className="row small">
          <span>Void</span>
          <span>
            {fmtRupiah(data.adjustments.voidTotal)} ({data.adjustments.voidCount}x)
          </span>
        </div>
        <div className="row small">
          <span>Diskon</span>
          <span>{fmtRupiah(data.adjustments.discountTotal)}</span>
        </div>

        <hr className="divider" />
        <div className="center small muted">
          Dicetak: {new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>
    </>
  )
}
