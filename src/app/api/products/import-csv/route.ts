import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, productGroups, products, workspaces } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'
import { syncWorkspaceToSheets } from '@/lib/google-sheets/sync'

type Row = {
  nama?: string
  variant?: string
  kategori?: string
  harga_jual?: string
  // legacy alias
  harga?: string
  harga_modal?: string
  sku?: string
  barcode?: string
  satuan?: string
  // legacy alias
  unit?: string
  stok?: string
  // legacy alias
  stock?: string
  aktif?: string
}

function toInt(v: string | undefined, fallback = 0): number {
  if (v == null) return fallback
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback
}

function toMoney(v: string | undefined): number | null {
  if (v == null || String(v).trim() === '') return null
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function toBoolish(v: string | undefined): boolean {
  if (v == null || v.trim() === '') return true
  const s = v.trim().toLowerCase()
  return s === 'ya' || s === 'yes' || s === 'true' || s === '1' || s === 'aktif'
}

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx

  let csvText: string
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'file too large (max 5MB)' }, { status: 400 })
    }
    csvText = await file.text()
  } else {
    const body = await req.json().catch(() => null)
    csvText = body?.csv
    if (typeof csvText !== 'string') {
      return NextResponse.json({ error: 'csv required' }, { status: 400 })
    }
  }

  const parsed = Papa.parse<Row>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  })
  const inputRows = (parsed.data ?? []).filter((r) => r && Object.keys(r).length > 0)
  if (!inputRows.length) {
    return NextResponse.json({ error: 'csv kosong atau format salah' }, { status: 400 })
  }

  const existingCats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.workspaceId, ctx.workspaceId))
  const catMap = new Map(existingCats.map((c) => [c.name.toLowerCase(), c.id]))

  const existingGroups = await db
    .select({ id: productGroups.id, name: productGroups.name })
    .from(productGroups)
    .where(eq(productGroups.workspaceId, ctx.workspaceId))
  const groupMap = new Map(existingGroups.map((g) => [g.name.toLowerCase(), g.id]))

  const errors: { row: number; reason: string }[] = []
  let groupsCreated = 0
  let variantsCreated = 0

  // Group rows by nama (preserve original casing for first occurrence)
  const grouped = new Map<string, { name: string; rows: { row: Row; index: number }[] }>()
  for (let i = 0; i < inputRows.length; i++) {
    const row = inputRows[i]
    const name = String(row.nama ?? '').trim()
    if (!name) {
      errors.push({ row: i + 2, reason: 'nama kosong' })
      continue
    }
    const key = name.toLowerCase()
    const bucket = grouped.get(key) ?? { name, rows: [] }
    bucket.rows.push({ row, index: i + 2 })
    grouped.set(key, bucket)
  }

  for (const [groupKey, bucket] of grouped) {
    const firstRow = bucket.rows[0].row
    const catName = String(firstRow.kategori ?? '').trim()
    let categoryId: string | null = null
    if (catName) {
      const k = catName.toLowerCase()
      const existing = catMap.get(k)
      if (existing) {
        categoryId = existing
      } else {
        const newCatId = newId()
        await db.insert(categories).values({
          id: newCatId,
          workspaceId: ctx.workspaceId,
          name: catName,
        })
        catMap.set(k, newCatId)
        categoryId = newCatId
      }
    }

    let groupId = groupMap.get(groupKey)
    if (!groupId) {
      groupId = newId()
      await db.insert(productGroups).values({
        id: groupId,
        workspaceId: ctx.workspaceId,
        categoryId,
        name: bucket.name,
      })
      groupMap.set(groupKey, groupId)
      groupsCreated++
    }

    for (const { row, index } of bucket.rows) {
      const priceSell = toMoney(row.harga_jual ?? row.harga)
      if (priceSell === null) {
        errors.push({ row: index, reason: 'harga_jual tidak valid' })
        continue
      }
      const priceCost = toMoney(row.harga_modal)
      const variantName = (row.variant ?? '').trim() || null
      const sku = row.sku?.trim() || null
      const barcode = row.barcode?.trim() || null
      const unit = (row.satuan ?? row.unit ?? '').trim() || 'pcs'
      const stock = toInt(row.stok ?? row.stock, 0)
      const stockTrack = stock > 0
      const isActive = toBoolish(row.aktif)

      try {
        await db.insert(products).values({
          id: newId(),
          workspaceId: ctx.workspaceId,
          groupId,
          categoryId,
          name: bucket.name,
          variantName,
          sku,
          barcode,
          priceSell: String(priceSell),
          priceCost: priceCost != null ? String(priceCost) : null,
          unit,
          stockTrack,
          stockCurrent: stock,
          isActive,
        })
        variantsCreated++
      } catch (e) {
        errors.push({
          row: index,
          reason: e instanceof Error ? e.message : 'gagal insert',
        })
      }
    }
  }

  // Auto-sync to Google Sheets if enabled
  let sheetsSyncResult: { ok: boolean; error?: string } | null = null
  if (variantsCreated > 0) {
    const wsRows = await db
      .select({ enabled: workspaces.sheetsSyncEnabled })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1)
    if (wsRows[0]?.enabled) {
      const r = await syncWorkspaceToSheets(ctx.workspaceId)
      sheetsSyncResult = r.ok ? { ok: true } : { ok: false, error: r.error }
    }
  }

  return NextResponse.json({
    success: variantsCreated,
    groupsCreated,
    variantsCreated,
    failed: errors.length,
    errors: errors.slice(0, 20),
    sheetsSync: sheetsSyncResult,
  })
}
