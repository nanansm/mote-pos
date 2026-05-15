import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const rows = await db
    .select({
      enabled: workspaces.sheetsSyncEnabled,
      url: workspaces.sheetsSyncUrl,
      lastSyncAt: workspaces.sheetsLastSyncAt,
      lastSyncStatus: workspaces.sheetsLastSyncStatus,
      lastSyncError: workspaces.sheetsLastSyncError,
    })
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1)
  return NextResponse.json(rows[0] ?? null)
}
