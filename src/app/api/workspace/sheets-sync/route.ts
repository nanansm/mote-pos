import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { extractSheetId } from '@/lib/google-sheets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  enabled: z.boolean().optional(),
  url: z.string().nullable().optional(),
})

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const rows = await db
    .select({
      enabled: workspaces.sheetsSyncEnabled,
      url: workspaces.sheetsSyncUrl,
      sheetId: workspaces.sheetsSyncId,
      lastSyncAt: workspaces.sheetsLastSyncAt,
      lastSyncStatus: workspaces.sheetsLastSyncStatus,
      lastSyncError: workspaces.sheetsLastSyncError,
    })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const updates: Partial<typeof workspaces.$inferInsert> = { updatedAt: new Date() }
  if (parsed.data.enabled !== undefined) updates.sheetsSyncEnabled = parsed.data.enabled
  if (parsed.data.url !== undefined) {
    const url = parsed.data.url?.trim() ?? ''
    if (url) {
      const sheetId = extractSheetId(url)
      if (!sheetId) {
        return NextResponse.json(
          { error: 'URL tidak valid' },
          { status: 400 },
        )
      }
      updates.sheetsSyncUrl = url
      updates.sheetsSyncId = sheetId
    } else {
      updates.sheetsSyncUrl = null
      updates.sheetsSyncId = null
    }
  }
  await db.update(workspaces).set(updates).where(eq(workspaces.id, ctx.workspaceId))
  return NextResponse.json({ ok: true })
}
