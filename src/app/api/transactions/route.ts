import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  cashiers,
  products,
  shiftSessions,
  transactionItems,
  transactionPayments,
  transactions,
  syncEvents,
  customers,
  customerDebts,
} from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

const ModifierOptSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  priceAdd: z.number().min(0),
})
const ModifierSchema = z.object({
  groupId: z.string().optional(),
  name: z.string(),
  options: z.array(ModifierOptSchema).default([]),
})
const ItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  priceUnit: z.number().min(0),
  quantity: z.number().int().min(1),
  modifiers: z.array(ModifierSchema).default([]),
  modifierTotal: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  subtotal: z.number().min(0),
  notes: z.string().nullable().optional(),
})

const PaymentSchema = z.object({
  method: z.enum(['cash', 'qris', 'transfer', 'debt']),
  amount: z.number().min(0),
  reference: z.string().nullable().optional(),
})

const Body = z.object({
  shiftId: z.string().min(1),
  cashierId: z.string().min(1),
  items: z.array(ItemSchema).min(1),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  discountType: z.enum(['amount', 'percent']).default('amount'),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),

  // Legacy single-payment (kept for backward compatibility)
  paymentMethod: z.enum(['cash', 'qris', 'transfer', 'debt', 'split']).optional(),
  paymentAmount: z.number().min(0).optional(),
  changeAmount: z.number().min(0).default(0),

  // New split-payment
  payments: z.array(PaymentSchema).optional(),

  customerId: z.string().nullable().optional(),
  customerName: z.string().max(128).nullable().optional(),
  customerPhone: z.string().max(32).nullable().optional(),
  saveCustomer: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

async function nextTrxNumber(workspaceId: string) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const rows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        gte(transactions.trxDate, start),
        lt(transactions.trxDate, end),
      ),
    )
  const seq = (rows[0]?.count ?? 0) + 1
  const yyyy = start.getFullYear()
  const mm = String(start.getMonth() + 1).padStart(2, '0')
  const dd = String(start.getDate()).padStart(2, '0')
  return `TRX-${yyyy}${mm}${dd}-${String(seq).padStart(4, '0')}`
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

  // Build normalized payments[]
  const payments = b.payments && b.payments.length > 0
    ? b.payments
    : b.paymentMethod && b.paymentMethod !== 'split'
    ? [{ method: b.paymentMethod, amount: b.paymentAmount ?? b.total, reference: null }]
    : []
  if (payments.length === 0) {
    return NextResponse.json({ error: 'no payments' }, { status: 400 })
  }

  const paidSum = payments.reduce((s, p) => s + p.amount, 0)
  if (paidSum < b.total - 0.5) {
    return NextResponse.json({ error: 'payment less than total' }, { status: 400 })
  }
  const hasDebt = payments.some((p) => p.method === 'debt')
  if (hasDebt && !b.customerId && !(b.customerName && b.saveCustomer)) {
    return NextResponse.json(
      { error: 'metode Hutang membutuhkan pelanggan terdaftar' },
      { status: 400 },
    )
  }

  const shift = await db
    .select()
    .from(shiftSessions)
    .where(
      and(
        eq(shiftSessions.id, b.shiftId),
        eq(shiftSessions.workspaceId, ctx.workspaceId),
        eq(shiftSessions.status, 'open'),
      ),
    )
    .limit(1)
  if (!shift[0]) return NextResponse.json({ error: 'shift not open' }, { status: 400 })

  const cashier = await db
    .select()
    .from(cashiers)
    .where(
      and(eq(cashiers.id, b.cashierId), eq(cashiers.workspaceId, ctx.workspaceId)),
    )
    .limit(1)
  if (!cashier[0]) return NextResponse.json({ error: 'cashier not found' }, { status: 400 })

  // Resolve / create customer
  let customerId: string | null = b.customerId ?? null
  let customerName: string | null = b.customerName ?? null
  let customerPhone: string | null = b.customerPhone ?? null

  if (customerId) {
    const c = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.workspaceId, ctx.workspaceId)),
      )
      .limit(1)
    if (c[0]) {
      customerName = c[0].name
      customerPhone = c[0].phone ?? customerPhone
    } else {
      customerId = null
    }
  }
  if (!customerId && b.saveCustomer && (customerName ?? '').trim().length > 0) {
    const newCid = newId()
    await db.insert(customers).values({
      id: newCid,
      workspaceId: ctx.workspaceId,
      name: customerName!.trim(),
      phone: customerPhone,
    })
    customerId = newCid
  }

  const cashAmount = payments
    .filter((p) => p.method === 'cash')
    .reduce((s, p) => s + p.amount, 0)
  const nonCashAmount = paidSum - cashAmount
  const totalDue = b.total
  const changeAmount = Math.max(0, cashAmount - Math.max(0, totalDue - nonCashAmount))
  const headerMethod: 'cash' | 'qris' | 'transfer' | 'debt' | 'split' =
    payments.length === 1 ? payments[0].method : 'split'

  const trxId = newId()
  const trxNumber = await nextTrxNumber(ctx.workspaceId)

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      id: trxId,
      workspaceId: ctx.workspaceId,
      outletId: shift[0].outletId,
      shiftId: shift[0].id,
      cashierId: cashier[0].id,
      trxNumber,
      subtotal: String(b.subtotal),
      discount: String(b.discount),
      discountType: b.discountType,
      tax: String(b.tax),
      total: String(b.total),
      paymentMethod: headerMethod,
      paymentAmount: String(paidSum),
      changeAmount: String(changeAmount),
      customerId: customerId,
      customerName: customerName ?? null,
      customerPhone: customerPhone ?? null,
      notes: b.notes ?? null,
      status: 'completed',
    })

    await tx.insert(transactionItems).values(
      b.items.map((it) => ({
        id: newId(),
        transactionId: trxId,
        productId: it.productId,
        productName: it.productName,
        priceUnit: String(it.priceUnit),
        quantity: it.quantity,
        modifiers: it.modifiers,
        modifierTotal: String(it.modifierTotal),
        discount: String(it.discount),
        discountType: it.discountType,
        subtotal: String(it.subtotal),
        notes: it.notes ?? null,
      })),
    )

    await tx.insert(transactionPayments).values(
      payments.map((p) => ({
        id: newId(),
        transactionId: trxId,
        method: p.method,
        amount: p.amount,
        reference: p.reference ?? null,
      })),
    )

    // decrement tracked stock
    for (const it of b.items) {
      await tx
        .update(products)
        .set({ stockCurrent: sql`${products.stockCurrent} - ${it.quantity}` })
        .where(
          and(
            eq(products.id, it.productId),
            eq(products.workspaceId, ctx.workspaceId),
            eq(products.stockTrack, true),
          ),
        )
    }

    // Debt → create customer_debts + update customers.total_debt
    const debtAmount = payments
      .filter((p) => p.method === 'debt')
      .reduce((s, p) => s + p.amount, 0)
    if (debtAmount > 0 && customerId) {
      const debtId = newId()
      await tx.insert(customerDebts).values({
        id: debtId,
        workspaceId: ctx.workspaceId,
        customerId,
        transactionId: trxId,
        amount: debtAmount,
        paidAmount: 0,
        status: 'open',
      })
      await tx
        .update(customers)
        .set({
          totalDebt: sql`${customers.totalDebt} + ${debtAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId))
      await tx.insert(syncEvents).values({
        id: newId(),
        workspaceId: ctx.workspaceId,
        eventType: 'debt_created',
        referenceId: debtId,
        payload: { transactionId: trxId, customerId, amount: debtAmount },
        status: 'pending',
      })
    }

    // Update customer aggregates
    if (customerId) {
      await tx
        .update(customers)
        .set({
          totalPurchases: sql`${customers.totalPurchases} + ${Math.round(b.total)}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId))
    }

    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: 'transaction',
      referenceId: trxId,
      payload: {
        trxNumber,
        total: b.total,
        paymentMethod: headerMethod,
        payments,
        cashierId: cashier[0].id,
        shiftId: shift[0].id,
        customerId,
      },
      status: 'pending',
    })
  })

  return NextResponse.json({ id: trxId, trxNumber, customerId })
}
