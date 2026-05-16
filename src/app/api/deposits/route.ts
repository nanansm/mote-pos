import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  customerDeposits,
  customers,
  syncEvents,
} from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  customerId: z.string().min(1),
  amount: z.number().int().positive(),
  paymentMethod: z.string().min(1).default('cash'),
  notes: z.string().max(500).nullable().optional(),
  shiftId: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''

  const conds = [eq(customerDeposits.workspaceId, ctx.workspaceId)]
  const rows = await db
    .select({
      id: customerDeposits.id,
      amount: customerDeposits.amount,
      balance: customerDeposits.balance,
      paymentMethod: customerDeposits.paymentMethod,
      status: customerDeposits.status,
      notes: customerDeposits.notes,
      createdAt: customerDeposits.createdAt,
      customerId: customerDeposits.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(customerDeposits)
    .innerJoin(customers, eq(customers.id, customerDeposits.customerId))
    .where(and(...conds))
    .orderBy(desc(customerDeposits.createdAt))
    .limit(500)

  const filtered = q
    ? rows.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q.toLowerCase()) ||
          (r.customerPhone ?? '').includes(q),
      )
    : rows

  // Stats
  const stats = await db
    .select({
      totalBalance: sql<number>`COALESCE(SUM(${customerDeposits.balance}), 0)::bigint`,
      customerCount: sql<number>`COUNT(DISTINCT ${customerDeposits.customerId})::int`,
    })
    .from(customerDeposits)
    .where(
      and(
        eq(customerDeposits.workspaceId, ctx.workspaceId),
        eq(customerDeposits.status, 'active'),
      ),
    )

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStats = await db
    .select({
      total: sql<number>`COALESCE(SUM(${customerDeposits.amount}), 0)::bigint`,
    })
    .from(customerDeposits)
    .where(
      and(
        eq(customerDeposits.workspaceId, ctx.workspaceId),
        gte(customerDeposits.createdAt, monthStart),
      ),
    )

  return NextResponse.json({
    data: filtered,
    stats: {
      totalBalance: Number(stats[0]?.totalBalance ?? 0),
      customerCount: Number(stats[0]?.customerCount ?? 0),
      monthAmount: Number(monthStats[0]?.total ?? 0),
    },
  })
}

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const b = parsed.data

  const c = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, b.customerId), eq(customers.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!c[0]) return NextResponse.json({ error: 'customer not found' }, { status: 404 })

  const id = newId()
  await db.transaction(async (tx) => {
    await tx.insert(customerDeposits).values({
      id,
      workspaceId: ctx.workspaceId,
      customerId: b.customerId,
      amount: b.amount,
      balance: b.amount,
      paymentMethod: b.paymentMethod,
      notes: b.notes ?? null,
      shiftId: b.shiftId ?? null,
      createdByCashierId: ctx.cashierId ?? null,
      status: 'active',
    })
    await tx
      .update(customers)
      .set({
        totalDepositBalance: sql`${customers.totalDepositBalance} + ${b.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, b.customerId))
    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: 'transaction',
      referenceId: id,
      payload: { kind: 'deposit_created', customerId: b.customerId, amount: b.amount },
      status: 'pending',
    })
  })

  return NextResponse.json({ id })
}
