import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const TIMEOUT_MS = 5000

export async function POST() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx

  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, ctx.workspaceId))
    .limit(1)
  const ws = rows[0]
  if (!ws) return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
  if (!ws.klirApiToken) return NextResponse.json({ error: 'klir api token belum diset' }, { status: 400 })

  const url = process.env.KLIR_API_URL
  if (!url) return NextResponse.json({ error: 'KLIR_API_URL belum diset' }, { status: 500 })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/sync/ping`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ws.klirApiToken}`,
        'x-mote-source': 'pos',
      },
      body: JSON.stringify({ klirWorkspaceId: ws.klirWorkspaceId }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { ok: false, status: res.status, error: text.slice(0, 200) },
        { status: 502 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'network error'
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
