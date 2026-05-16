import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, productGroups, products } from '@/lib/db/schema'
import { requireAuthCtx, requireUserCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VariantSchema = z.object({
  variantName: z.string().max(120).nullable().optional(),
  sku: z.string().max(64).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  priceSell: z.number().min(0),
  priceCost: z.number().min(0).nullable().optional(),
  unit: z.string().min(1).max(32).default('pcs'),
  stockTrack: z.boolean().optional(),
  stockCurrent: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

const Body = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().nullable().optional(),
  variants: z.array(VariantSchema).min(1),
})

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx

  const groups = await db
    .select({
      id: productGroups.id,
      name: productGroups.name,
      isActive: productGroups.isActive,
      categoryId: productGroups.categoryId,
      categoryName: categories.name,
      createdAt: productGroups.createdAt,
    })
    .from(productGroups)
    .leftJoin(categories, eq(categories.id, productGroups.categoryId))
    .where(eq(productGroups.workspaceId, ctx.workspaceId))
    .orderBy(asc(productGroups.name))

  const ids = groups.map((g) => g.id)
  const variants = ids.length
    ? await db
        .select({
          id: products.id,
          groupId: products.groupId,
          variantName: products.variantName,
          sku: products.sku,
          barcode: products.barcode,
          priceSell: products.priceSell,
          priceCost: products.priceCost,
          unit: products.unit,
          stockTrack: products.stockTrack,
          stockCurrent: products.stockCurrent,
          isActive: products.isActive,
        })
        .from(products)
        .where(inArray(products.groupId, ids))
        .orderBy(asc(products.variantName))
    : []

  const byGroup = new Map<string, typeof variants>()
  for (const v of variants) {
    const arr = byGroup.get(v.groupId) ?? []
    arr.push(v)
    byGroup.set(v.groupId, arr)
  }

  const data = groups.map((g) => {
    const list = byGroup.get(g.id) ?? []
    const prices = list.map((v) => Number(v.priceSell))
    const minPrice = prices.length ? Math.min(...prices) : 0
    const stock = list.reduce((s, v) => s + (v.stockTrack ? v.stockCurrent : 0), 0)
    return {
      ...g,
      variantCount: list.length,
      minPrice,
      totalStock: stock,
      variants: list.map((v) => ({
        ...v,
        priceSell: Number(v.priceSell),
        priceCost: v.priceCost != null ? Number(v.priceCost) : null,
      })),
    }
  })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body', issues: parsed.error.issues }, { status: 400 })
  }
  const b = parsed.data

  if (b.categoryId) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, b.categoryId), eq(categories.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (!cat[0]) return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }

  // Reject duplicate group name
  const exists = await db
    .select({ id: productGroups.id })
    .from(productGroups)
    .where(and(eq(productGroups.workspaceId, ctx.workspaceId), eq(productGroups.name, b.name)))
    .limit(1)
  if (exists[0]) {
    return NextResponse.json({ error: 'Produk dengan nama ini sudah ada' }, { status: 409 })
  }

  const groupId = newId()
  await db.transaction(async (tx) => {
    await tx.insert(productGroups).values({
      id: groupId,
      workspaceId: ctx.workspaceId,
      categoryId: b.categoryId ?? null,
      name: b.name,
    })
    for (const v of b.variants) {
      await tx.insert(products).values({
        id: newId(),
        workspaceId: ctx.workspaceId,
        groupId,
        categoryId: b.categoryId ?? null,
        name: b.name,
        variantName: v.variantName?.trim() || null,
        sku: v.sku?.trim() || null,
        barcode: v.barcode?.trim() || null,
        priceSell: String(v.priceSell),
        priceCost: v.priceCost != null ? String(v.priceCost) : null,
        unit: v.unit ?? 'pcs',
        stockTrack: v.stockTrack ?? false,
        stockCurrent: v.stockCurrent ?? 0,
        isActive: v.isActive ?? true,
      })
    }
  })
  return NextResponse.json({ id: groupId })
}
