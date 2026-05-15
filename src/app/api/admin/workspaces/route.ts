import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/owner-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  businessType: string
  ownerEmail: string | null
  outletCount: string
  productCount: string
  trxCount: string
  gmvTotal: string
  createdAt: Date
}

export async function GET(req: Request) {
  await requireOwner()
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)))
  const offset = (page - 1) * limit
  const searchRaw = url.searchParams.get('search')?.trim() ?? ''
  const search = searchRaw.toLowerCase()
  const bt = url.searchParams.get('business_type')
  const btFilter = bt === 'resto' || bt === 'retail' || bt === 'jasa' ? bt : null
  const like = `%${search}%`

  const result = await db.execute<Row>(sql`
    SELECT w.id, w.name, w.business_type::text AS "businessType",
      u.email AS "ownerEmail",
      COALESCE((SELECT COUNT(*)::int FROM mote_pos.outlets o WHERE o.workspace_id = w.id), 0)::text AS "outletCount",
      COALESCE((SELECT COUNT(*)::int FROM mote_pos.products p WHERE p.workspace_id = w.id AND p.is_active = true), 0)::text AS "productCount",
      COALESCE((SELECT COUNT(*)::int FROM mote_pos.transactions t WHERE t.workspace_id = w.id AND t.status = 'completed'), 0)::text AS "trxCount",
      COALESCE((SELECT SUM(t.total) FROM mote_pos.transactions t WHERE t.workspace_id = w.id AND t.status = 'completed'), 0)::text AS "gmvTotal",
      w.created_at AS "createdAt"
    FROM mote_pos.workspaces w
    LEFT JOIN mote_pos."user" u ON u.id = w.owner_id
    WHERE
      (${search} = '' OR lower(w.name) LIKE ${like} OR lower(COALESCE(u.email, '')) LIKE ${like})
      AND (${btFilter}::text IS NULL OR w.business_type::text = ${btFilter})
    ORDER BY w.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `)

  const totalRow = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::text AS c FROM mote_pos.workspaces w
    LEFT JOIN mote_pos."user" u ON u.id = w.owner_id
    WHERE
      (${search} = '' OR lower(w.name) LIKE ${like} OR lower(COALESCE(u.email, '')) LIKE ${like})
      AND (${btFilter}::text IS NULL OR w.business_type::text = ${btFilter})
  `)
  const total = Number(totalRow.rows[0]?.c ?? 0)

  return NextResponse.json({
    data: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      businessType: r.businessType,
      ownerEmail: r.ownerEmail,
      outletCount: Number(r.outletCount),
      productCount: Number(r.productCount),
      trxCount: Number(r.trxCount),
      gmvTotal: Number(r.gmvTotal),
      createdAt: r.createdAt,
    })),
    total,
    page,
    limit,
  })
}
