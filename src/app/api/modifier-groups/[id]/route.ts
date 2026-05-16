import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { modifierGroups } from '@/lib/db/schema'
import { requireUserCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(['single', 'multiple']).optional(),
  isRequired: z.boolean().optional(),
  minSelect: z.number().int().min(0).max(50).optional(),
  maxSelect: z.number().int().min(1).max(50).optional(),
})

export async function PUT(req: Request, ctxArg: Ctx) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  await db
    .update(modifierGroups)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctxArg: Ctx) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  await db
    .delete(modifierGroups)
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
