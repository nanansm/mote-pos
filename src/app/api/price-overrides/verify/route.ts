import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { priceOverrides, auditLogs, shiftSessions, syncEvents } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { verifyManagerPin } from '@/lib/manager-pin'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'

const Body = z.object({
  pin: z.string().min(6).max(6),
  productId: z.string().min(1),
  originalPrice: z.number().int().min(0),
  newPrice: z.number().int().min(0),
  reason: z.string().nullable().optional(),
})

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const check = await verifyManagerPin(ctx.workspaceId, parsed.data.pin)
  if (!check.ok) {
    await db.insert(auditLogs).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      action: 'pin_failed',
      entityType: 'price_override',
      metadata: {
        productId: parsed.data.productId,
        attempted: 'price_override',
      },
    })
    return NextResponse.json({ error: check.reason }, { status: 403 })
  }

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

  const overrideId = newId()
  await db.transaction(async (tx) => {
    await tx.insert(priceOverrides).values({
      id: overrideId,
      workspaceId: ctx.workspaceId,
      productId: parsed.data.productId,
      originalPrice: parsed.data.originalPrice,
      newPrice: parsed.data.newPrice,
      difference: parsed.data.newPrice - parsed.data.originalPrice,
      cashierId: check.cashierId,
      approvedByManagerPin: true,
      shiftId,
      reason: parsed.data.reason ?? null,
    })
    await tx.insert(auditLogs).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      shiftId,
      cashierId: check.cashierId,
      action: 'price_override',
      entityType: 'product',
      entityId: parsed.data.productId,
      oldValue: { priceUnit: parsed.data.originalPrice },
      newValue: { priceUnit: parsed.data.newPrice },
      metadata: {
        difference: parsed.data.newPrice - parsed.data.originalPrice,
        managerName: check.cashierName,
      },
    })
    await tx.insert(syncEvents).values({
      id: newId(),
      workspaceId: ctx.workspaceId,
      eventType: 'price_override',
      referenceId: overrideId,
      payload: {
        productId: parsed.data.productId,
        originalPrice: parsed.data.originalPrice,
        newPrice: parsed.data.newPrice,
      },
      status: 'pending',
    })
  })

  return NextResponse.json({
    ok: true,
    overrideId,
    managerName: check.cashierName,
  })
}
