import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  transactions,
  transactionItems,
  refunds,
  refundItems,
  products,
  syncEvents,
  auditLogs,
  shiftSessions,
} from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { verifyManagerPin } from '@/lib/manager-pin'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'

const Body = z.object({
  pin: z.string().min(6).max(6),
  reason: z.string().min(2).max(500),
  method: z.enum(['cash', 'qris', 'transfer']).default('cash'),
  // If items omitted/empty → treat as full refund
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const trxRows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.workspaceId, ctx.workspaceId)))
    .limit(1)
  const trx = trxRows[0]
  if (!trx) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (trx.status === 'refunded') {
    return NextResponse.json({ error: 'transaksi sudah di-refund' }, { status: 400 })
  }
  if (trx.status === 'voided') {
    return NextResponse.json({ error: 'transaksi sudah di-void' }, { status: 400 })
  }

  const check = await verifyManagerPin(ctx.workspaceId, parsed.data.pin)
  if (!check.ok) {
    await db.insert(auditLogs).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      action: 'pin_failed',
      entityType: 'transaction',
      entityId: id,
      metadata: { attempted: 'refund' },
    })
    return NextResponse.json({ error: check.reason }, { status: 403 })
  }

  const allItems = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id))

  // Determine refund items
  const requestItems = parsed.data.items ?? []
  const isFull = requestItems.length === 0
  const itemMap = new Map(allItems.map((i) => [i.id, i]))
  type RefundLine = {
    item: typeof allItems[number]
    qty: number
    unitAmount: number
    totalAmount: number
  }
  const lines: RefundLine[] = []
  if (isFull) {
    for (const it of allItems) {
      const totalAmount = Number(it.subtotal)
      const qty = it.quantity
      const unitAmount = qty > 0 ? Math.round(totalAmount / qty) : 0
      lines.push({ item: it, qty, unitAmount, totalAmount })
    }
  } else {
    for (const r of requestItems) {
      const it = itemMap.get(r.itemId)
      if (!it) {
        return NextResponse.json({ error: `item ${r.itemId} bukan dari transaksi ini` }, { status: 400 })
      }
      if (r.quantity > it.quantity) {
        return NextResponse.json(
          { error: `qty refund melebihi qty asli untuk ${it.productName}` },
          { status: 400 },
        )
      }
      const fullSubtotal = Number(it.subtotal)
      const unitAmount = it.quantity > 0 ? Math.round(fullSubtotal / it.quantity) : 0
      const totalAmount = unitAmount * r.quantity
      lines.push({ item: it, qty: r.quantity, unitAmount, totalAmount })
    }
  }

  const refundTotal = lines.reduce((s, l) => s + l.totalAmount, 0)
  if (refundTotal <= 0) {
    return NextResponse.json({ error: 'jumlah refund nol' }, { status: 400 })
  }

  const totalQtyRefunded = lines.reduce((s, l) => s + l.qty, 0)
  const originalQty = allItems.reduce((s, it) => s + it.quantity, 0)
  const becomesFullRefund = isFull || totalQtyRefunded >= originalQty

  const openShift = await db
    .select({ id: shiftSessions.id })
    .from(shiftSessions)
    .where(
      and(
        eq(shiftSessions.workspaceId, ctx.workspaceId),
        eq(shiftSessions.status, 'open'),
      ),
    )
    .limit(1)
  const shiftId = openShift[0]?.id ?? null

  const refundId = newId()

  await db.transaction(async (tx) => {
    await tx.insert(refunds).values({
      id: refundId,
      workspaceId: ctx.workspaceId,
      transactionId: id,
      refundAmount: Math.round(refundTotal),
      refundMethod: parsed.data.method,
      reason: parsed.data.reason,
      refundedByCashierId: check.cashierId,
      approvedByManagerPin: true,
      shiftId,
    })

    if (lines.length > 0) {
      await tx.insert(refundItems).values(
        lines.map((l) => ({
          id: newId(),
          refundId,
          transactionItemId: l.item.id,
          productId: l.item.productId,
          quantity: l.qty,
          unitAmount: l.unitAmount,
          totalAmount: l.totalAmount,
        })),
      )
    }

    // Restock tracked products
    const productQty = new Map<string, number>()
    for (const l of lines) {
      productQty.set(l.item.productId, (productQty.get(l.item.productId) ?? 0) + l.qty)
    }
    if (productQty.size > 0) {
      const ids = Array.from(productQty.keys())
      const tracked = await tx
        .select({ id: products.id, stockTrack: products.stockTrack })
        .from(products)
        .where(
          and(eq(products.workspaceId, ctx.workspaceId), inArray(products.id, ids)),
        )
      for (const t of tracked) {
        if (!t.stockTrack) continue
        const q = productQty.get(t.id) ?? 0
        if (q > 0) {
          await tx
            .update(products)
            .set({
              stockCurrent: sql`${products.stockCurrent} + ${q}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, t.id))
        }
      }
    }

    await tx
      .update(transactions)
      .set({
        status: becomesFullRefund ? 'refunded' : 'partial_refund',
        voidedBy: check.cashierId,
        voidedAt: new Date(),
        voidReason: parsed.data.reason,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))

    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: becomesFullRefund ? 'refund' : 'partial_refund',
      referenceId: refundId,
      payload: {
        transactionId: id,
        amount: refundTotal,
        reason: parsed.data.reason,
        items: lines.map((l) => ({
          productId: l.item.productId,
          quantity: l.qty,
          totalAmount: l.totalAmount,
        })),
      },
      status: 'pending',
    })

    await tx.insert(auditLogs).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      shiftId,
      cashierId: check.cashierId,
      action: 'refund',
      entityType: 'transaction',
      entityId: id,
      oldValue: { status: trx.status },
      newValue: { status: becomesFullRefund ? 'refunded' : 'partial_refund' },
      metadata: {
        refundId,
        refundAmount: refundTotal,
        reason: parsed.data.reason,
        managerName: check.cashierName,
        itemCount: lines.length,
      },
    })
  })

  return NextResponse.json({
    ok: true,
    refundId,
    refundAmount: refundTotal,
    status: becomesFullRefund ? 'refunded' : 'partial_refund',
  })
}
