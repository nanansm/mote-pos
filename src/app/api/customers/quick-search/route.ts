import { NextResponse } from 'next/server'
import { and, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ data: [] })

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      totalDebt: customers.totalDebt,
    })
    .from(customers)
    .where(
      and(
        eq(customers.workspaceId, ctx.workspaceId),
        or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q}%`)),
      ),
    )
    .limit(10)
  return NextResponse.json({ data: rows })
}
