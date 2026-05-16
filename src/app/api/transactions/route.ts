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
  heldCarts,
  paymentMethods,
  customerDeposits,
  depositUsages,
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
  method: z.string().min(1),
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
  paymentMethod: z.string().optional(),
  paymentAmount: z.number().min(0).optional(),
  changeAmount: z.number().min(0).default(0),

  // New split-payment
  payments: z.array(PaymentSchema).optional(),

  customerId: z.string().nullable().optional(),
  customerName: z.string().max(128).nullable().optional(),
  customerPhone: z.string().max(32).nullable().optional(),
  saveCustomer: z.boolean().optional(),
  heldCartId: z.string().nullable().optional(),
  pickupStatus: z.enum(['pickup_immediate', 'pickup_pending']).optional(),
  pickupNotes: z.string().max(500).nullable().optional(),
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

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

export async function POST(req: Request) {
  let payload: unknown = null
  try {
    const ctx = await requireAuthCtx()
    if (isErrResponse(ctx)) return ctx
    payload = await req.json().catch(() => null)
    console.log('[trx] payload:', JSON.stringify(payload))

    const parsed = Body.safeParse(payload)
    if (!parsed.success) {
      console.error('[trx] invalid body:', parsed.error.issues)
      return NextResponse.json(
        { error: 'invalid body', issues: parsed.error.issues },
        { status: 400 },
      )
    }
    const b = parsed.data

    // Build normalized payments[]
    const payments =
      b.payments && b.payments.length > 0
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

    // Resolve payment method types for the workspace (custom methods supported)
    const methodRows = await db
      .select({ code: paymentMethods.code, type: paymentMethods.type })
      .from(paymentMethods)
      .where(eq(paymentMethods.workspaceId, ctx.workspaceId))
    const methodTypeByCode: Record<string, string> = {
      cash: 'cash',
      qris: 'cashless',
      transfer: 'cashless',
      debt: 'debt',
      deposit: 'deposit',
    }
    for (const m of methodRows) methodTypeByCode[m.code] = m.type
    const isDebt = (code: string) => methodTypeByCode[code] === 'debt'
    const isCashCode = (code: string) => methodTypeByCode[code] === 'cash'
    const isDepositCode = (code: string) => methodTypeByCode[code] === 'deposit'
    const hasDebt = payments.some((p) => isDebt(p.method))
    const hasDeposit = payments.some((p) => isDepositCode(p.method))
    const depositPayAmount = payments
      .filter((p) => isDepositCode(p.method))
      .reduce((s, p) => s + p.amount, 0)

    // Auto-save customer rule:
    // - customerId set → link existing (validated below)
    // - customerId null + (name or phone provided) → auto-create
    // - all empty → snapshot only
    const trimmedName = (b.customerName ?? '').trim()
    const trimmedPhone = (b.customerPhone ?? '').trim()
    const wantAutoCreate = !b.customerId && (trimmedName.length > 0 || trimmedPhone.length > 0)

    if (hasDebt && !b.customerId && !wantAutoCreate) {
      return NextResponse.json(
        { error: 'metode Hutang membutuhkan pelanggan (nama atau HP).' },
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
      .where(and(eq(cashiers.id, b.cashierId), eq(cashiers.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (!cashier[0]) return NextResponse.json({ error: 'cashier not found' }, { status: 400 })

    // Resolve / create customer
    let customerId: string | null = b.customerId ?? null
    let customerName: string | null = trimmedName.length > 0 ? trimmedName : null
    let customerPhone: string | null = trimmedPhone.length > 0 ? trimmedPhone : null

    if (customerId) {
      const c = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.workspaceId, ctx.workspaceId)))
        .limit(1)
      if (!c[0]) {
        return NextResponse.json(
          { error: 'pelanggan tidak ditemukan' },
          { status: 400 },
        )
      }
      customerName = c[0].name
      customerPhone = c[0].phone ?? customerPhone
    } else if (wantAutoCreate) {
      const displayName = customerName ?? (customerPhone ? `Pelanggan ${customerPhone}` : '')
      if (displayName) {
        const newCid = newId()
        await db.insert(customers).values({
          id: newCid,
          workspaceId: ctx.workspaceId,
          name: displayName,
          phone: customerPhone,
        })
        customerId = newCid
        customerName = displayName
      }
    }

    if (hasDebt && !customerId) {
      return NextResponse.json(
        { error: 'gagal link pelanggan untuk Hutang' },
        { status: 400 },
      )
    }

    if (hasDeposit) {
      if (!customerId) {
        return NextResponse.json(
          { error: 'metode Saldo Titipan butuh pelanggan terdaftar' },
          { status: 400 },
        )
      }
      const balRows = await db
        .select({ bal: customers.totalDepositBalance })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1)
      const currentBalance = Number(balRows[0]?.bal ?? 0)
      if (depositPayAmount > currentBalance) {
        return NextResponse.json(
          { error: `Saldo titipan tidak cukup (sisa ${currentBalance})` },
          { status: 400 },
        )
      }
    }

    console.log('[trx] customer resolved:', { customerId, customerName, customerPhone })
    console.log('[trx] payments:', payments)

    const cashAmount = payments
      .filter((p) => isCashCode(p.method))
      .reduce((s, p) => s + p.amount, 0)
    const nonCashAmount = paidSum - cashAmount
    const totalDue = b.total
    const changeAmount = Math.max(0, cashAmount - Math.max(0, totalDue - nonCashAmount))
    const headerMethod = payments.length === 1 ? payments[0].method : 'split'

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
        paymentMethod: headerMethod as never,
        paymentAmount: String(paidSum),
        changeAmount: String(changeAmount),
        customerId: customerId,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
        notes: b.notes ?? null,
        status: 'completed',
        pickupStatus: b.pickupStatus ?? 'pickup_immediate',
        pickupNotes: b.pickupNotes ?? null,
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
        .filter((p) => isDebt(p.method))
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

      // Deposit FIFO consumption
      if (hasDeposit && customerId && depositPayAmount > 0) {
        const activeDeposits = await tx
          .select()
          .from(customerDeposits)
          .where(
            and(
              eq(customerDeposits.customerId, customerId),
              eq(customerDeposits.workspaceId, ctx.workspaceId),
              eq(customerDeposits.status, 'active'),
            ),
          )
          .orderBy(customerDeposits.createdAt)

        let remaining = depositPayAmount
        for (const dep of activeDeposits) {
          if (remaining <= 0) break
          const bal = Number(dep.balance)
          if (bal <= 0) continue
          const take = Math.min(bal, remaining)
          const after = bal - take
          await tx
            .update(customerDeposits)
            .set({
              balance: after,
              status: after <= 0 ? 'depleted' : 'active',
              updatedAt: new Date(),
            })
            .where(eq(customerDeposits.id, dep.id))
          await tx.insert(depositUsages).values({
            id: newId(),
            depositId: dep.id,
            transactionId: trxId,
            amount: take,
            balanceAfter: after,
            usedByCashierId: ctx.cashierId ?? cashier[0].id,
            shiftId: shift[0].id,
            notes: null,
          })
          remaining -= take
        }
        await tx
          .update(customers)
          .set({
            totalDepositBalance: sql`GREATEST(0, ${customers.totalDepositBalance} - ${depositPayAmount})`,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId))
        await tx.insert(syncEvents).values({
          id: newId(),
          workspaceId: ctx.workspaceId,
          eventType: 'transaction',
          referenceId: trxId,
          payload: { kind: 'deposit_used', amount: depositPayAmount, customerId },
          status: 'pending',
        })
      }

      // Delete held cart if resumed
      if (b.heldCartId) {
        await tx
          .delete(heldCarts)
          .where(
            and(eq(heldCarts.id, b.heldCartId), eq(heldCarts.workspaceId, ctx.workspaceId)),
          )
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
      console.log('[trx] before commit', { trxId, trxNumber })
    })

    console.log('[trx] success:', { trxNumber, trxId })
    return NextResponse.json({ id: trxId, trxNumber, customerId })
  } catch (err) {
    console.error('[trx] FAILED:', err)
    console.error('[trx] payload was:', payload)
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
