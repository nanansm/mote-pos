import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const res = await db.execute<{ unit: string }>(sql`
    SELECT DISTINCT unit
    FROM mote_pos.products
    WHERE workspace_id = ${ctx.workspaceId} AND unit IS NOT NULL AND unit <> ''
    ORDER BY unit
  `)
  return NextResponse.json({ data: res.rows.map((r) => r.unit) })
}
