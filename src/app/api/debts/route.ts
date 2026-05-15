import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, or, sql, gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customerDebts, customers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  customerId: z.string().min(1),
  amount: z.number().int().min(1),
  notes: z.string().max(500).nullable().optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')?.trim() ?? ''
  const customerId = url.searchParams.get('customer_id')

  const conds = [eq(customerDebts.workspaceId, ctx.workspaceId)]
  if (status === 'open' || status === 'partial' || status === 'paid') {
    conds.push(eq(customerDebts.status, status))
  }
  if (customerId) conds.push(eq(customerDebts.customerId, customerId))

  let rows = await db
    .select({
      id: customerDebts.id,
      amount: customerDebts.amount,
      paidAmount: customerDebts.paidAmount,
      status: customerDebts.status,
      notes: customerDebts.notes,
      transactionId: customerDebts.transactionId,
      createdAt: customerDebts.createdAt,
      customerId: customerDebts.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(customerDebts)
    .innerJoin(customers, eq(customers.id, customerDebts.customerId))
    .where(and(...conds))
    .orderBy(desc(customerDebts.createdAt))
    .limit(200)

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        (r.customerPhone ?? '').toLowerCase().includes(q),
    )
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const summary = await db
    .select({
      outstanding: sql<string>`COALESCE(SUM(${customerDebts.amount} - ${customerDebts.paidAmount}), 0)::text`,
      customersCount: sql<string>`COUNT(DISTINCT ${customerDebts.customerId})::text`,
    })
    .from(customerDebts)
    .where(
      and(
        eq(customerDebts.workspaceId, ctx.workspaceId),
        or(eq(customerDebts.status, 'open'), eq(customerDebts.status, 'partial')),
      ),
    )
  const monthly = await db
    .select({
      total: sql<string>`COALESCE(SUM(${customerDebts.amount}), 0)::text`,
    })
    .from(customerDebts)
    .where(
      and(
        eq(customerDebts.workspaceId, ctx.workspaceId),
        gte(customerDebts.createdAt, monthStart),
      ),
    )

  return NextResponse.json({
    data: rows,
    summary: {
      outstanding: Number(summary[0]?.outstanding ?? 0),
      customersCount: Number(summary[0]?.customersCount ?? 0),
      monthlyCreated: Number(monthly[0]?.total ?? 0),
    },
  })
}

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const id = newId()
  await db.transaction(async (tx) => {
    await tx.insert(customerDebts).values({
      id,
      workspaceId: ctx.workspaceId,
      customerId: parsed.data.customerId,
      amount: parsed.data.amount,
      paidAmount: 0,
      status: 'open',
      notes: parsed.data.notes ?? null,
    })
    await tx
      .update(customers)
      .set({
        totalDebt: sql`${customers.totalDebt} + ${parsed.data.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, parsed.data.customerId))
  })
  return NextResponse.json({ id })
}
