import { NextResponse } from 'next/server'
import { sql, eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, transactions, transactionItems, products, productGroups, categories } from '@/lib/db/schema'
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
  const sort = url.searchParams.get('sort') ?? 'qty'

  const c = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!c[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const rows = await db
    .select({
      productId: transactionItems.productId,
      productName: transactionItems.productName,
      qty: sql<number>`SUM(${transactionItems.quantity})::int`,
      total: sql<number>`SUM(${transactionItems.subtotal})::bigint`,
      frequency: sql<number>`COUNT(DISTINCT ${transactionItems.transactionId})::int`,
      lastBuy: sql<Date>`MAX(${transactions.trxDate})`,
      groupName: productGroups.name,
      variantName: products.variantName,
      categoryName: categories.name,
    })
    .from(transactionItems)
    .innerJoin(transactions, eq(transactions.id, transactionItems.transactionId))
    .leftJoin(products, eq(products.id, transactionItems.productId))
    .leftJoin(productGroups, eq(productGroups.id, products.groupId))
    .leftJoin(categories, eq(categories.id, productGroups.categoryId))
    .where(and(eq(transactions.customerId, id), eq(transactions.workspaceId, ctx.workspaceId)))
    .groupBy(
      transactionItems.productId,
      transactionItems.productName,
      productGroups.name,
      products.variantName,
      categories.name,
    )

  const sorted = rows.sort((a, b) => {
    if (sort === 'total') return Number(b.total) - Number(a.total)
    if (sort === 'frequency') return Number(b.frequency) - Number(a.frequency)
    return Number(b.qty) - Number(a.qty)
  })

  return NextResponse.json({
    data: sorted.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      groupName: r.groupName,
      variantName: r.variantName,
      categoryName: r.categoryName,
      qty: Number(r.qty),
      total: Number(r.total),
      frequency: Number(r.frequency),
      lastBuy: r.lastBuy,
    })),
  })
}
