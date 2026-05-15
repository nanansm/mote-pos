import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const barcode = url.searchParams.get('barcode')?.trim()
  if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 })

  const rows = await db
    .select({
      id: products.id,
      groupId: products.groupId,
      name: products.name,
      variantName: products.variantName,
      priceSell: products.priceSell,
      unit: products.unit,
      isActive: products.isActive,
    })
    .from(products)
    .where(
      and(
        eq(products.workspaceId, ctx.workspaceId),
        eq(products.barcode, barcode),
        eq(products.isActive, true),
      ),
    )
    .limit(1)

  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    id: rows[0].id,
    groupId: rows[0].groupId,
    name: rows[0].name,
    variantName: rows[0].variantName,
    priceSell: Number(rows[0].priceSell),
    unit: rows[0].unit,
  })
}
