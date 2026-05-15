import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, transactions, customerDebts, debtPayments } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(32).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.workspaceId, ctx.workspaceId)))
    .limit(1)
  const customer = rows[0]
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const trxs = await db
    .select({
      id: transactions.id,
      trxNumber: transactions.trxNumber,
      trxDate: transactions.trxDate,
      total: transactions.total,
      status: transactions.status,
      paymentMethod: transactions.paymentMethod,
    })
    .from(transactions)
    .where(eq(transactions.customerId, id))
    .orderBy(desc(transactions.trxDate))
    .limit(50)

  const debts = await db
    .select()
    .from(customerDebts)
    .where(eq(customerDebts.customerId, id))
    .orderBy(desc(customerDebts.createdAt))

  void debtPayments
  return NextResponse.json({
    customer,
    transactions: trxs.map((t) => ({ ...t, total: Number(t.total) })),
    debts,
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const updates: Partial<{ name: string; phone: string | null; notes: string | null; updatedAt: Date }> = {
    updatedAt: new Date(),
  }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone ?? null
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ?? null

  const res = await db
    .update(customers)
    .set(updates)
    .where(and(eq(customers.id, id), eq(customers.workspaceId, ctx.workspaceId)))
    .returning({ id: customers.id })
  if (!res[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const c = await db
    .select({ totalPurchases: customers.totalPurchases })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!c[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (c[0].totalPurchases > 0) {
    return NextResponse.json(
      { error: 'Customer ini punya riwayat transaksi, tidak bisa dihapus' },
      { status: 400 },
    )
  }
  await db.delete(customers).where(eq(customers.id, id))
  return NextResponse.json({ ok: true })
}
