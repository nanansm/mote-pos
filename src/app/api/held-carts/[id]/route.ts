import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { heldCarts } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  const rows = await db
    .select()
    .from(heldCarts)
    .where(and(eq(heldCarts.id, id), eq(heldCarts.workspaceId, ctx.workspaceId)))
    .limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await params
  await db
    .delete(heldCarts)
    .where(and(eq(heldCarts.id, id), eq(heldCarts.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
