import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, asc, and, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  products,
  productGroups,
  productModifierGroups,
  categories,
  modifierGroups,
} from '@/lib/db/schema'
import { requireAuthCtx, requireUserCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx

  const rows = await db
    .select({
      id: products.id,
      groupId: products.groupId,
      name: products.name,
      variantName: products.variantName,
      sku: products.sku,
      barcode: products.barcode,
      priceSell: products.priceSell,
      priceCost: products.priceCost,
      unit: products.unit,
      stockTrack: products.stockTrack,
      stockCurrent: products.stockCurrent,
      isActive: products.isActive,
      categoryId: products.categoryId,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.workspaceId, ctx.workspaceId))
    .orderBy(asc(products.name), asc(products.variantName))

  const ids = rows.map((r) => r.id)
  const links = ids.length
    ? await db
        .select()
        .from(productModifierGroups)
        .where(inArray(productModifierGroups.productId, ids))
    : []
  const grouped = new Map<string, string[]>()
  for (const l of links) {
    const list = grouped.get(l.productId) ?? []
    list.push(l.groupId)
    grouped.set(l.productId, list)
  }
  const data = rows.map((r) => ({ ...r, modifierGroupIds: grouped.get(r.id) ?? [] }))
  return NextResponse.json({ data })
}

const Body = z.object({
  groupId: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  variantName: z.string().max(120).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  sku: z.string().max(64).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  priceSell: z.number().min(0),
  priceCost: z.number().min(0).nullable().optional(),
  unit: z.string().min(1).max(32).optional(),
  stockTrack: z.boolean().optional(),
  stockCurrent: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  modifierGroupIds: z.array(z.string()).optional(),
})

/**
 * Legacy single-product POST endpoint.
 * Creates a product_group implicitly if groupId is not provided.
 * Prefer POST /api/product-groups for new code.
 */
export async function POST(req: Request) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body', issues: parsed.error.issues }, { status: 400 })
  }
  const b = parsed.data
  const id = newId()

  if (b.categoryId) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, b.categoryId), eq(categories.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (!cat[0]) return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }

  let groupId = b.groupId ?? null
  if (groupId) {
    const g = await db
      .select({ id: productGroups.id })
      .from(productGroups)
      .where(and(eq(productGroups.id, groupId), eq(productGroups.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (!g[0]) return NextResponse.json({ error: 'invalid group' }, { status: 400 })
  } else {
    // Auto-create group from product name (or attach to existing same-name group)
    const existing = await db
      .select({ id: productGroups.id })
      .from(productGroups)
      .where(
        and(eq(productGroups.workspaceId, ctx.workspaceId), eq(productGroups.name, b.name)),
      )
      .limit(1)
    if (existing[0]) {
      groupId = existing[0].id
    } else {
      groupId = newId()
      await db.insert(productGroups).values({
        id: groupId,
        workspaceId: ctx.workspaceId,
        categoryId: b.categoryId ?? null,
        name: b.name,
      })
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id,
      workspaceId: ctx.workspaceId,
      groupId: groupId!,
      categoryId: b.categoryId ?? null,
      name: b.name,
      variantName: b.variantName?.trim() || null,
      sku: b.sku ?? null,
      barcode: b.barcode ?? null,
      priceSell: String(b.priceSell),
      priceCost: b.priceCost != null ? String(b.priceCost) : null,
      unit: b.unit ?? 'pcs',
      stockTrack: b.stockTrack ?? false,
      stockCurrent: b.stockCurrent ?? 0,
      isActive: b.isActive ?? true,
    })
    if (b.modifierGroupIds && b.modifierGroupIds.length) {
      const valid = await tx
        .select({ id: modifierGroups.id })
        .from(modifierGroups)
        .where(
          and(
            eq(modifierGroups.workspaceId, ctx.workspaceId),
            inArray(modifierGroups.id, b.modifierGroupIds),
          ),
        )
      const validIds = valid.map((v) => v.id)
      if (validIds.length) {
        await tx.insert(productModifierGroups).values(
          validIds.map((gid) => ({ productId: id, groupId: gid })),
        )
      }
    }
  })
  return NextResponse.json({ id, groupId })
}
