import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, transactions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const c = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!c[0]) return new Response('not found', { status: 404 })

  const trxs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.customerId, id), eq(transactions.workspaceId, ctx.workspaceId)))
    .orderBy(desc(transactions.trxDate))

  const header = 'TRX Number,Tanggal,Total,Diskon,Metode,Status'
  const lines = trxs.map((t) =>
    [
      csvEscape(t.trxNumber),
      csvEscape(new Date(t.trxDate).toISOString()),
      csvEscape(Number(t.total)),
      csvEscape(Number(t.discount)),
      csvEscape(t.paymentMethod),
      csvEscape(t.status),
    ].join(','),
  )
  const body = [header, ...lines].join('\n')
  const safeName = c[0].name.replace(/[^a-zA-Z0-9_-]+/g, '_')
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="riwayat_${safeName}.csv"`,
    },
  })
}
