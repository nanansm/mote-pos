import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  categories,
  productGroups,
  products,
  transactionItems,
} from '@/lib/db/schema'
import { requireAuthCtx, requireUserCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VariantPatch = z.object({
  id: z.string().nullable().optional(),
  variantName: z.string().max(120).nullable().optional(),
  sku: z.string().max(64).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  priceSell: z.number().min(0),
  priceCost: z.number().min(0).nullable().optional(),
  unit: z.string().min(1).max(32).default('pcs'),
  stockTrack: z.boolean().optional(),
  stockCurrent: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  _delete: z.boolean().optional(),
})

const Body = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  variants: z.array(VariantPatch).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const groupRows = await db
    .select()
    .from(productGroups)
    .where(and(eq(productGroups.id, id), eq(productGroups.workspaceId, ctx.workspaceId)))
    .limit(1)
  const group = groupRows[0]
  if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const vars = await db.select().from(products).where(eq(products.groupId, id))
  return NextResponse.json({
    group,
    variants: vars.map((v) => ({
      ...v,
      priceSell: Number(v.priceSell),
      priceCost: v.priceCost != null ? Number(v.priceCost) : null,
    })),
  })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  const b = parsed.data

  const groupRows = await db
    .select()
    .from(productGroups)
    .where(and(eq(productGroups.id, id), eq(productGroups.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!groupRows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (b.categoryId !== undefined && b.categoryId !== null) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, b.categoryId), eq(categories.workspaceId, ctx.workspaceId)))
      .limit(1)
    if (!cat[0]) return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }

  await db.transaction(async (tx) => {
    const groupUpdates: Partial<typeof productGroups.$inferInsert> = { updatedAt: new Date() }
    if (b.name !== undefined) groupUpdates.name = b.name
    if (b.categoryId !== undefined) groupUpdates.categoryId = b.categoryId ?? null
    if (b.isActive !== undefined) groupUpdates.isActive = b.isActive
    await tx.update(productGroups).set(groupUpdates).where(eq(productGroups.id, id))

    if (b.variants) {
      // Cascade name/category to product rows
      const productUpdates: Partial<typeof products.$inferInsert> = { updatedAt: new Date() }
      if (b.name !== undefined) productUpdates.name = b.name
      if (b.categoryId !== undefined) productUpdates.categoryId = b.categoryId ?? null
      if (Object.keys(productUpdates).length > 1) {
        await tx.update(products).set(productUpdates).where(eq(products.groupId, id))
      }

      for (const v of b.variants) {
        if (v._delete && v.id) {
          // Block delete if used in transactions
          const used = await tx
            .select({ id: transactionItems.id })
            .from(transactionItems)
            .where(eq(transactionItems.productId, v.id))
            .limit(1)
          if (used[0]) continue // skip silently — UI should pre-check
          await tx.delete(products).where(eq(products.id, v.id))
        } else if (v.id) {
          await tx
            .update(products)
            .set({
              variantName: v.variantName?.trim() || null,
              sku: v.sku?.trim() || null,
              barcode: v.barcode?.trim() || null,
              priceSell: String(v.priceSell),
              priceCost: v.priceCost != null ? String(v.priceCost) : null,
              unit: v.unit ?? 'pcs',
              stockTrack: v.stockTrack ?? false,
              stockCurrent: v.stockCurrent ?? 0,
              isActive: v.isActive ?? true,
              updatedAt: new Date(),
            })
            .where(and(eq(products.id, v.id), eq(products.groupId, id)))
        } else {
          // New variant
          await tx.insert(products).values({
            id: newId(),
            workspaceId: ctx.workspaceId,
            groupId: id,
            categoryId: b.categoryId ?? groupRows[0].categoryId,
            name: b.name ?? groupRows[0].name,
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
      }
    }
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const variants = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.groupId, id))
  const used = variants.length
    ? await db
        .select({ id: transactionItems.id })
        .from(transactionItems)
        .where(inArray(transactionItems.productId, variants.map((v) => v.id)))
        .limit(1)
    : []
  if (used[0]) {
    return NextResponse.json(
      { error: 'Produk ini sudah dipakai di transaksi, tidak bisa dihapus' },
      { status: 400 },
    )
  }
  await db
    .delete(productGroups)
    .where(and(eq(productGroups.id, id), eq(productGroups.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
