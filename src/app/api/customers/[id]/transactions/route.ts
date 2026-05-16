import { NextResponse } from 'next/server'
import { and, desc, eq, gte, lte, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  customers,
  transactions,
  transactionItems,
  transactionPayments,
} from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const c = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!c[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const conds = [eq(transactions.customerId, id), eq(transactions.workspaceId, ctx.workspaceId)]
  if (from) conds.push(gte(transactions.trxDate, new Date(from)))
  if (to) conds.push(lte(transactions.trxDate, new Date(to)))

  const trxs = await db
    .select()
    .from(transactions)
    .where(and(...conds))
    .orderBy(desc(transactions.trxDate))
    .limit(200)

  if (trxs.length === 0) return NextResponse.json({ data: [] })
  const trxIds = trxs.map((t) => t.id)

  const items = await db
    .select()
    .from(transactionItems)
    .where(inArray(transactionItems.transactionId, trxIds))

  const pays = await db
    .select()
    .from(transactionPayments)
    .where(inArray(transactionPayments.transactionId, trxIds))

  return NextResponse.json({
    data: trxs.map((t) => ({
      id: t.id,
      trxNumber: t.trxNumber,
      trxDate: t.trxDate,
      total: Number(t.total),
      discount: Number(t.discount),
      status: t.status,
      paymentMethod: t.paymentMethod,
      items: items
        .filter((it) => it.transactionId === t.id)
        .map((it) => ({
          id: it.id,
          productName: it.productName,
          priceUnit: Number(it.priceUnit),
          quantity: it.quantity,
          modifiers: it.modifiers,
          modifierTotal: Number(it.modifierTotal),
          discount: Number(it.discount),
          subtotal: Number(it.subtotal),
          notes: it.notes,
        })),
      payments: pays
        .filter((p) => p.transactionId === t.id)
        .map((p) => ({ method: p.method, amount: Number(p.amount), reference: p.reference })),
    })),
  })
}
