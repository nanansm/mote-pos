import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentMethods } from '@/lib/db/schema'
import { requireUserCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  code: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/).optional(),
  label: z.string().min(1).max(64).optional(),
  type: z.enum(['cash', 'cashless', 'debt', 'deposit']).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const existing = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.label !== undefined) updates.label = parsed.data.label
  if (parsed.data.type !== undefined && !existing[0].isDefault) updates.type = parsed.data.type
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder
  if (parsed.data.code !== undefined && !existing[0].isDefault) updates.code = parsed.data.code

  await db
    .update(paymentMethods)
    .set(updates)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params

  const existing = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!existing[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (existing[0].isDefault) {
    return NextResponse.json({ error: 'Metode default tidak bisa dihapus' }, { status: 400 })
  }

  await db
    .delete(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
