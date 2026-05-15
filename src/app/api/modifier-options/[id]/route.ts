import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { modifierGroups, modifierOptions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

async function checkOwn(id: string, workspaceId: string) {
  const row = await db
    .select({ id: modifierOptions.id })
    .from(modifierOptions)
    .innerJoin(modifierGroups, eq(modifierGroups.id, modifierOptions.groupId))
    .where(and(eq(modifierOptions.id, id), eq(modifierGroups.workspaceId, workspaceId)))
    .limit(1)
  return Boolean(row[0])
}

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  priceAdd: z.number().min(0).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  if (!(await checkOwn(id, ctx.workspaceId)))
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const upd: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) upd.name = parsed.data.name
  if (parsed.data.priceAdd !== undefined) upd.priceAdd = String(parsed.data.priceAdd)
  if (parsed.data.sortOrder !== undefined) upd.sortOrder = parsed.data.sortOrder
  if (parsed.data.isActive !== undefined) upd.isActive = parsed.data.isActive
  await db.update(modifierOptions).set(upd).where(eq(modifierOptions.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  if (!(await checkOwn(id, ctx.workspaceId)))
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  await db.delete(modifierOptions).where(eq(modifierOptions.id, id))
  return NextResponse.json({ ok: true })
}
