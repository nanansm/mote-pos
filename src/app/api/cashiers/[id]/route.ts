import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['cashier', 'manager']).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  await db
    .update(cashiers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(cashiers.id, id), eq(cashiers.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  await db
    .delete(cashiers)
    .where(and(eq(cashiers.id, id), eq(cashiers.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
