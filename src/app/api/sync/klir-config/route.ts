import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  enabled: z.boolean().optional(),
  klirWorkspaceId: z.string().nullable().optional(),
  klirApiToken: z.string().nullable().optional(),
})

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const rows = await db
    .select({
      enabled: workspaces.klirSyncEnabled,
      klirWorkspaceId: workspaces.klirWorkspaceId,
      klirApiTokenMasked: workspaces.klirApiToken,
      lastSyncAt: workspaces.klirLastSyncAt,
    })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1)
  const r = rows[0]
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({
    enabled: r.enabled,
    klirWorkspaceId: r.klirWorkspaceId,
    hasToken: !!r.klirApiTokenMasked,
    lastSyncAt: r.lastSyncAt,
  })
}

export async function PUT(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const updates: Partial<{
    klirSyncEnabled: boolean
    klirWorkspaceId: string | null
    klirApiToken: string | null
    updatedAt: Date
  }> = { updatedAt: new Date() }
  if (typeof parsed.data.enabled === 'boolean') updates.klirSyncEnabled = parsed.data.enabled
  if (parsed.data.klirWorkspaceId !== undefined)
    updates.klirWorkspaceId = parsed.data.klirWorkspaceId ?? null
  if (parsed.data.klirApiToken !== undefined)
    updates.klirApiToken = parsed.data.klirApiToken ?? null

  await db.update(workspaces).set(updates).where(eq(workspaces.id, ctx.workspaceId))
  return NextResponse.json({ ok: true })
}
