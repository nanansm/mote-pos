import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { syncWorkspaceToSheets } from '@/lib/google-sheets/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function run(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const targets = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.sheetsSyncEnabled, true))

  const results: Array<{ workspaceId: string; name: string; ok: boolean; error?: string }> = []
  for (const ws of targets) {
    const r = await syncWorkspaceToSheets(ws.id)
    results.push({ workspaceId: ws.id, name: ws.name, ok: r.ok, error: r.ok ? undefined : r.error })
  }
  return NextResponse.json({
    total: targets.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}

export async function POST(req: Request) {
  return run(req)
}
export async function GET(req: Request) {
  return run(req)
}
