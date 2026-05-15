import { and, eq, sql } from 'drizzle-orm'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { db } from '../db'
import { categories, productGroups, products, workspaces } from '../db/schema'
import { newId } from '../ids'
import { errorMessage } from './index'

// Same shape as the Produk tab header written by sync.ts:
//   Produk | Variant | SKU | Barcode | Harga Jual | Harga Modal | Satuan | Stok | Aktif
type ProdukRow = {
  produk: string
  variant: string
  sku: string
  barcode: string
  hargaJual: string
  hargaModal: string
  satuan: string
  stok: string
  aktif: string
}

function getAuth(): JWT | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string }
    if (!parsed.client_email || !parsed.private_key) return null
    return new JWT({
      email: parsed.client_email,
      key: parsed.private_key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  } catch {
    return null
  }
}

function normalizeHeader(h: string): keyof ProdukRow | null {
  const k = h.trim().toLowerCase()
  if (k === 'produk' || k === 'nama') return 'produk'
  if (k === 'variant') return 'variant'
  if (k === 'sku') return 'sku'
  if (k === 'barcode') return 'barcode'
  if (k === 'harga jual' || k === 'harga_jual' || k === 'harga') return 'hargaJual'
  if (k === 'harga modal' || k === 'harga_modal') return 'hargaModal'
  if (k === 'satuan' || k === 'unit') return 'satuan'
  if (k === 'stok' || k === 'stock') return 'stok'
  if (k === 'aktif' || k === 'is_active') return 'aktif'
  return null
}

function toMoney(v: string): number | null {
  const s = v.trim()
  if (!s) return null
  const n = Number(s.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}
function toInt(v: string, fallback = 0): number {
  const s = v.trim()
  if (!s) return fallback
  const n = Number(s.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback
}
function toBoolish(v: string): boolean {
  const s = v.trim().toLowerCase()
  if (!s) return true
  return s === 'ya' || s === 'yes' || s === 'true' || s === '1' || s === 'aktif'
}

export type ImportResult =
  | {
      ok: true
      groupsCreated: number
      groupsUpdated: number
      variantsCreated: number
      variantsUpdated: number
      skipped: number
      errors: { row: number; reason: string }[]
    }
  | { ok: false; error: string }

export async function importProductsFromSheet(workspaceId: string): Promise<ImportResult> {
  const auth = getAuth()
  if (!auth) return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON belum diset' }

  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  const ws = wsRows[0]
  if (!ws) return { ok: false, error: 'workspace not found' }
  if (!ws.sheetsSyncId) return { ok: false, error: 'Sheet ID belum diset. Hubungkan dulu.' }

  let values: string[][] = []
  try {
    const sheetsApi = google.sheets({ version: 'v4', auth })
    const res = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: ws.sheetsSyncId,
      range: 'Produk!A1:I10000',
    })
    values = (res.data.values ?? []) as string[][]
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }

  if (values.length < 2) {
    return { ok: false, error: 'Tab "Produk" kosong atau belum punya data.' }
  }

  const header = values[0].map(normalizeHeader)
  const rows: ProdukRow[] = []
  for (let r = 1; r < values.length; r++) {
    const row = values[r]
    if (!row || row.every((c) => !c || !c.trim())) continue
    const obj: ProdukRow = {
      produk: '',
      variant: '',
      sku: '',
      barcode: '',
      hargaJual: '',
      hargaModal: '',
      satuan: '',
      stok: '',
      aktif: '',
    }
    for (let i = 0; i < header.length; i++) {
      const key = header[i]
      if (!key) continue
      obj[key] = String(row[i] ?? '')
    }
    if (!obj.produk.trim()) continue
    rows.push(obj)
  }
  if (rows.length === 0) {
    return { ok: false, error: 'Tidak ada baris produk yang valid di tab "Produk".' }
  }

  // Build category cache
  const catRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.workspaceId, workspaceId))
  const catMap = new Map(catRows.map((c) => [c.name.toLowerCase(), c.id]))
  void catMap // category column is not in Produk tab; keep variable for potential extension

  // Existing groups and variants (key by lowercase name / sku)
  const existingGroups = await db
    .select({ id: productGroups.id, name: productGroups.name })
    .from(productGroups)
    .where(eq(productGroups.workspaceId, workspaceId))
  const groupByName = new Map(existingGroups.map((g) => [g.name.toLowerCase(), g.id]))

  const existingVariants = await db
    .select({
      id: products.id,
      groupId: products.groupId,
      variantName: products.variantName,
      sku: products.sku,
    })
    .from(products)
    .where(eq(products.workspaceId, workspaceId))
  const variantBySku = new Map<string, string>()
  const variantByGroupVariant = new Map<string, string>()
  for (const v of existingVariants) {
    if (v.sku) variantBySku.set(v.sku.toLowerCase(), v.id)
    const key = `${v.groupId}::${(v.variantName ?? '').toLowerCase()}`
    variantByGroupVariant.set(key, v.id)
  }

  let groupsCreated = 0
  let groupsUpdated = 0
  let variantsCreated = 0
  let variantsUpdated = 0
  let skipped = 0
  const errors: { row: number; reason: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 2 // +1 for header, +1 for 1-based
    const name = r.produk.trim()
    const priceSell = toMoney(r.hargaJual)
    if (priceSell === null) {
      errors.push({ row: rowNum, reason: 'harga jual tidak valid' })
      continue
    }
    const variantName = r.variant.trim() || null
    const sku = r.sku.trim() || null
    const barcode = r.barcode.trim() || null
    const unit = r.satuan.trim() || 'pcs'
    const stockRaw = r.stok.trim()
    const stockTrack = stockRaw !== ''
    const stockCurrent = toInt(r.stok, 0)
    const isActive = toBoolish(r.aktif)
    const priceCost = toMoney(r.hargaModal)

    // Resolve / create group
    let groupId = groupByName.get(name.toLowerCase())
    if (!groupId) {
      groupId = newId()
      await db.insert(productGroups).values({
        id: groupId,
        workspaceId,
        name,
        isActive: true,
      })
      groupByName.set(name.toLowerCase(), groupId)
      groupsCreated++
    } else {
      groupsUpdated++ // we touch it conceptually; not actually updating cols here
    }

    // Resolve variant: prefer SKU match, fall back to group+variant name match
    let variantId: string | undefined
    if (sku) variantId = variantBySku.get(sku.toLowerCase())
    if (!variantId) {
      const key = `${groupId}::${(variantName ?? '').toLowerCase()}`
      variantId = variantByGroupVariant.get(key)
    }

    if (variantId) {
      try {
        await db
          .update(products)
          .set({
            groupId,
            categoryId: null,
            name,
            variantName,
            sku,
            barcode,
            priceSell: String(priceSell),
            priceCost: priceCost != null ? String(priceCost) : null,
            unit,
            stockTrack,
            stockCurrent,
            isActive,
            updatedAt: new Date(),
          })
          .where(
            and(eq(products.id, variantId), eq(products.workspaceId, workspaceId)),
          )
        variantsUpdated++
      } catch (err) {
        errors.push({ row: rowNum, reason: `update failed: ${errorMessage(err)}` })
        skipped++
      }
    } else {
      try {
        const newVarId = newId()
        await db.insert(products).values({
          id: newVarId,
          workspaceId,
          groupId,
          categoryId: null,
          name,
          variantName,
          sku,
          barcode,
          priceSell: String(priceSell),
          priceCost: priceCost != null ? String(priceCost) : null,
          unit,
          stockTrack,
          stockCurrent,
          isActive,
        })
        if (sku) variantBySku.set(sku.toLowerCase(), newVarId)
        variantByGroupVariant.set(
          `${groupId}::${(variantName ?? '').toLowerCase()}`,
          newVarId,
        )
        variantsCreated++
      } catch (err) {
        const msg = errorMessage(err)
        // SKU unique-ish — surface as friendly message
        errors.push({ row: rowNum, reason: msg.includes('unique') ? 'SKU duplikat' : msg })
        skipped++
      }
    }
  }

  // Update sheets sync metadata
  await db
    .update(workspaces)
    .set({
      sheetsLastSyncAt: new Date(),
      sheetsLastSyncStatus: errors.length === 0 ? 'success' : 'success',
      sheetsLastSyncError: errors.length > 0 ? `${errors.length} row error saat import` : null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId))

  void sql
  return {
    ok: true,
    groupsCreated,
    groupsUpdated,
    variantsCreated,
    variantsUpdated,
    skipped,
    errors: errors.slice(0, 20),
  }
}
