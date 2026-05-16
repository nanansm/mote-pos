import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  products,
  productModifierGroups,
  modifierGroups,
  categories,
} from '@/lib/db/schema'
import { requireUserCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

const Body = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: z.string().nullable().optional(),
  sku: z.string().max(64).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  priceSell: z.number().min(0).optional(),
  priceCost: z.number().min(0).nullable().optional(),
  unit: z.string().min(1).max(32).optional(),
  stockTrack: z.boolean().optional(),
  stockCurrent: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  modifierGroupIds: z.array(z.string()).optional(),
})

export async function PUT(req: Request, ctxArg: Ctx) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const b = parsed.data

  if (b.categoryId) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, b.categoryId), eq(categories.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (!cat[0]) return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }

  await db.transaction(async (tx) => {
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (b.name !== undefined) update.name = b.name
    if (b.categoryId !== undefined) update.categoryId = b.categoryId
    if (b.sku !== undefined) update.sku = b.sku
    if (b.barcode !== undefined) update.barcode = b.barcode
    if (b.priceSell !== undefined) update.priceSell = String(b.priceSell)
    if (b.priceCost !== undefined)
      update.priceCost = b.priceCost == null ? null : String(b.priceCost)
    if (b.unit !== undefined) update.unit = b.unit
    if (b.stockTrack !== undefined) update.stockTrack = b.stockTrack
    if (b.stockCurrent !== undefined) update.stockCurrent = b.stockCurrent
    if (b.isActive !== undefined) update.isActive = b.isActive

    await tx
      .update(products)
      .set(update)
      .where(and(eq(products.id, id), eq(products.workspaceId, ctx.workspaceId)))

    if (b.modifierGroupIds !== undefined) {
      await tx.delete(productModifierGroups).where(eq(productModifierGroups.productId, id))
      if (b.modifierGroupIds.length) {
        const valid = await tx
          .select({ id: modifierGroups.id })
          .from(modifierGroups)
          .where(
            and(
              eq(modifierGroups.workspaceId, ctx.workspaceId),
              inArray(modifierGroups.id, b.modifierGroupIds),
            ),
          )
        const ids = valid.map((v) => v.id)
        if (ids.length) {
          await tx
            .insert(productModifierGroups)
            .values(ids.map((gid) => ({ productId: id, groupId: gid })))
        }
      }
    }
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctxArg: Ctx) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
