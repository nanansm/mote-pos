import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import {
  markSyncEventsAsFailed,
  markSyncEventsAsSynced,
  syncBatchToKlir,
} from '@/lib/sync/klir'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dateStr = url.searchParams.get('date')
  const date = dateStr ? new Date(dateStr) : new Date()
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 })
  }

  const targets = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.klirSyncEnabled, true))

  const results: Array<{ workspaceId: string; name: string; ok: boolean; error?: string }> = []
  for (const ws of targets) {
    const r = await syncBatchToKlir(ws.id, date)
    if (r.ok) {
      await markSyncEventsAsSynced(ws.id, date)
    } else {
      await markSyncEventsAsFailed(ws.id, date, r.error ?? 'unknown')
    }
    results.push({ workspaceId: ws.id, name: ws.name, ok: r.ok, error: r.error })
  }
  return NextResponse.json({
    date: date.toISOString().slice(0, 10),
    total: targets.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}

export async function GET(req: Request) {
  return POST(req)
}
