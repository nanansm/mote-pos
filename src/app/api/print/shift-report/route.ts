import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { printShiftReport } from '@/lib/printer'

export const runtime = 'nodejs'

const Body = z.object({ shiftId: z.string().min(1) })

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  try {
    await printShiftReport(ctx.workspaceId, parsed.data.shiftId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'gagal cetak'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
