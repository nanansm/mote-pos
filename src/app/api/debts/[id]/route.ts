import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customerDebts, customers, debtPayments, cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const rows = await db
    .select({
      debt: customerDebts,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(customerDebts)
    .innerJoin(customers, eq(customers.id, customerDebts.customerId))
    .where(
      and(eq(customerDebts.id, id), eq(customerDebts.workspaceId, ctx.workspaceId)),
    )
    .limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const payments = await db
    .select({
      id: debtPayments.id,
      amount: debtPayments.amount,
      paymentMethod: debtPayments.paymentMethod,
      notes: debtPayments.notes,
      createdAt: debtPayments.createdAt,
      cashierName: cashiers.name,
    })
    .from(debtPayments)
    .leftJoin(cashiers, eq(cashiers.id, debtPayments.paidByCashierId))
    .where(eq(debtPayments.debtId, id))
    .orderBy(desc(debtPayments.createdAt))

  return NextResponse.json({
    debt: rows[0].debt,
    customer: { name: rows[0].customerName, phone: rows[0].customerPhone },
    payments,
  })
}
