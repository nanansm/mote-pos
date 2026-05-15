import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, sql, desc, asc, or, ilike } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, transactions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(32).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const search = url.searchParams.get('search')?.trim() ?? ''

  const baseWhere = eq(customers.workspaceId, ctx.workspaceId)
  const where = search
    ? and(
        baseWhere,
        or(ilike(customers.name, `%${search}%`), ilike(customers.phone, `%${search}%`)),
      )
    : baseWhere

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      notes: customers.notes,
      totalPurchases: customers.totalPurchases,
      totalDebt: customers.totalDebt,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      lastTrxAt: sql<Date | null>`(
        SELECT MAX(trx_date) FROM mote_pos.transactions
        WHERE customer_id = ${customers.id}
      )`,
    })
    .from(customers)
    .where(where)
    .orderBy(desc(customers.updatedAt))
  void asc
  void transactions
  void desc

  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const id = newId()
  await db.insert(customers).values({
    id,
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    notes: parsed.data.notes ?? null,
  })
  return NextResponse.json({ id, name: parsed.data.name })
}
