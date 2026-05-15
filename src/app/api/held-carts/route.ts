import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { heldCarts, customers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  label: z.string().min(1).max(200),
  shiftId: z.string().nullable().optional(),
  cashierId: z.string().min(1),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  cartData: z.any(),
  subtotal: z.number().int().min(0),
  itemCount: z.number().int().min(0),
  notes: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const shiftId = url.searchParams.get('shift_id')

  const conds = [
    eq(heldCarts.workspaceId, ctx.workspaceId),
    eq(heldCarts.outletId, ctx.outletId),
  ]
  if (shiftId) conds.push(eq(heldCarts.shiftId, shiftId))

  const rows = await db
    .select()
    .from(heldCarts)
    .where(and(...conds))
    .orderBy(desc(heldCarts.createdAt))
    .limit(100)
  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  let customerId = parsed.data.customerId ?? null
  let customerName = parsed.data.customerName ?? null
  let customerPhone = parsed.data.customerPhone ?? null

  if (customerId) {
    const c = await db
      .select({ name: customers.name, phone: customers.phone })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (c[0]) {
      customerName = c[0].name
      customerPhone = c[0].phone ?? customerPhone
    } else {
      customerId = null
    }
  }

  const id = newId()
  await db.insert(heldCarts).values({
    id,
    workspaceId: ctx.workspaceId,
    outletId: ctx.outletId,
    shiftId: parsed.data.shiftId ?? null,
    cashierId: parsed.data.cashierId,
    label: parsed.data.label,
    customerId,
    customerName,
    customerPhone,
    cartData: parsed.data.cartData,
    subtotal: parsed.data.subtotal,
    itemCount: parsed.data.itemCount,
    notes: parsed.data.notes ?? null,
  })
  return NextResponse.json({ id })
}
