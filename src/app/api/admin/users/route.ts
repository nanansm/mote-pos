import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/owner-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  email: string
  role: 'user' | 'owner'
  workspaceName: string | null
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
  const role = url.searchParams.get('role')
  const roleFilter = role === 'user' || role === 'owner' ? role : null
  const like = `%${search}%`

  const result = await db.execute<Row>(sql`
    SELECT u.id, u.name, u.email, u.role,
      w.name AS "workspaceName",
      COALESCE((SELECT COUNT(*)::int FROM mote_pos.transactions t WHERE t.workspace_id = u.workspace_id AND t.status = 'completed'), 0)::text AS "trxCount",
      COALESCE((SELECT SUM(t.total) FROM mote_pos.transactions t WHERE t.workspace_id = u.workspace_id AND t.status = 'completed'), 0)::text AS "gmvTotal",
      u.created_at AS "createdAt"
    FROM mote_pos."user" u
    LEFT JOIN mote_pos.workspaces w ON w.id = u.workspace_id
    WHERE
      (${search} = '' OR lower(u.name) LIKE ${like} OR lower(u.email) LIKE ${like})
      AND (${roleFilter}::text IS NULL OR u.role::text = ${roleFilter})
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `)

  const totalRow = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::text AS c FROM mote_pos."user" u
    WHERE
      (${search} = '' OR lower(u.name) LIKE ${like} OR lower(u.email) LIKE ${like})
      AND (${roleFilter}::text IS NULL OR u.role::text = ${roleFilter})
  `)
  const total = Number(totalRow.rows[0]?.c ?? 0)

  return NextResponse.json({
    data: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      workspaceName: r.workspaceName,
      trxCount: Number(r.trxCount),
      gmvTotal: Number(r.gmvTotal),
      createdAt: r.createdAt,
    })),
    total,
    page,
    limit,
  })
}
