import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { markSyncEventsAsFailed, markSyncEventsAsSynced, syncBatchToKlir } from '@/lib/sync/klir'

export const runtime = 'nodejs'

const Body = z.object({ date: z.string().optional() })

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const date = parsed.data.date ? new Date(parsed.data.date) : new Date()
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 })
  }

  const result = await syncBatchToKlir(ctx.workspaceId, date)
  if (result.ok) {
    await markSyncEventsAsSynced(ctx.workspaceId, date)
    return NextResponse.json({ ok: true, payload: result.payload })
  }
  await markSyncEventsAsFailed(ctx.workspaceId, date, result.error ?? 'unknown')
  return NextResponse.json(
    { ok: false, error: result.error, payload: result.payload },
    { status: result.status === 502 ? 502 : 400 },
  )
}
