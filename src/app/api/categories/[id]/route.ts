import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  await db
    .update(categories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
