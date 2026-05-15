import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.workspaceId, ctx.workspaceId))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
  return NextResponse.json({ data: rows })
}

const Body = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const id = newId()
  await db.insert(categories).values({
    id,
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    sortOrder: parsed.data.sortOrder ?? 0,
    isActive: parsed.data.isActive ?? true,
  })
  return NextResponse.json({ id })
}
