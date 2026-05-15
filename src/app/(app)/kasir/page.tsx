import { redirect } from 'next/navigation'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  categories,
  modifierGroups,
  modifierOptions,
  productGroups,
  productModifierGroups,
  products,
  workspaces,
} from '@/lib/db/schema'
import { getCurrentContext } from '@/lib/session'
import { KasirClient } from './kasir-client'

export const dynamic = 'force-dynamic'

export default async function KasirPage() {
  const ctx = await getCurrentContext()
  if (!ctx?.workspace) redirect('/sign-in')

  const wsId = ctx.workspace.id

  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.workspaceId, wsId), eq(categories.isActive, true)))
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  const groups = await db
    .select()
    .from(productGroups)
    .where(and(eq(productGroups.workspaceId, wsId), eq(productGroups.isActive, true)))
    .orderBy(asc(productGroups.name))

  const prods = await db
    .select()
    .from(products)
    .where(and(eq(products.workspaceId, wsId), eq(products.isActive, true)))
    .orderBy(asc(products.name), asc(products.variantName))

  const prodIds = prods.map((p) => p.id)
  const pmg = prodIds.length
    ? await db
        .select()
        .from(productModifierGroups)
        .where(inArray(productModifierGroups.productId, prodIds))
    : []

  const modGroupIds = Array.from(new Set(pmg.map((l) => l.groupId)))
  const modGroups = modGroupIds.length
    ? await db.select().from(modifierGroups).where(inArray(modifierGroups.id, modGroupIds))
    : []
  const opts = modGroupIds.length
    ? await db
        .select()
        .from(modifierOptions)
        .where(
          and(
            inArray(modifierOptions.groupId, modGroupIds),
            eq(modifierOptions.isActive, true),
          ),
        )
        .orderBy(asc(modifierOptions.sortOrder), asc(modifierOptions.name))
    : []

  const optionsByGroup = new Map<string, typeof opts>()
  for (const o of opts) {
    const l = optionsByGroup.get(o.groupId) ?? []
    l.push(o)
    optionsByGroup.set(o.groupId, l)
  }
  const productModGroups = new Map<string, string[]>()
  for (const l of pmg) {
    const list = productModGroups.get(l.productId) ?? []
    list.push(l.groupId)
    productModGroups.set(l.productId, list)
  }

  // Build groups with their variants
  const variantsByGroup = new Map<
    string,
    Array<{
      id: string
      variantName: string | null
      priceSell: number
      unit: string
      barcode: string | null
      stockTrack: boolean
      stockCurrent: number
      modifierGroupIds: string[]
    }>
  >()
  for (const p of prods) {
    const arr = variantsByGroup.get(p.groupId) ?? []
    arr.push({
      id: p.id,
      variantName: p.variantName,
      priceSell: Number(p.priceSell),
      unit: p.unit,
      barcode: p.barcode,
      stockTrack: p.stockTrack,
      stockCurrent: p.stockCurrent,
      modifierGroupIds: productModGroups.get(p.id) ?? [],
    })
    variantsByGroup.set(p.groupId, arr)
  }

  const groupsForUi = groups
    .filter((g) => (variantsByGroup.get(g.id) ?? []).length > 0)
    .map((g) => ({
      id: g.id,
      name: g.name,
      categoryId: g.categoryId,
      variants: variantsByGroup.get(g.id) ?? [],
    }))

  const groupsForModifier = modGroups.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    isRequired: g.isRequired,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    options: (optionsByGroup.get(g.id) ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      priceAdd: Number(o.priceAdd),
    })),
  }))

  const wsRows = await db
    .select({ autoPrintReceipt: workspaces.autoPrintReceipt })
    .from(workspaces)
    .where(eq(workspaces.id, wsId))
    .limit(1)
  const autoPrint = wsRows[0]?.autoPrintReceipt ?? true

  return (
    <KasirClient
      categories={cats.map((c) => ({ id: c.id, name: c.name }))}
      productGroups={groupsForUi}
      modifierGroups={groupsForModifier}
      autoPrint={autoPrint}
    />
  )
}
