import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { extractSheetId, testConnection, getServiceAccountEmail } from '@/lib/google-sheets'

export const runtime = 'nodejs'

const Body = z.object({ url: z.string().min(1) })

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const sheetId = extractSheetId(parsed.data.url)
  if (!sheetId) {
    return NextResponse.json(
      { error: 'URL tidak valid. Paste full URL Google Sheet.' },
      { status: 400 },
    )
  }

  const result = await testConnection(sheetId)
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        hint:
          'Pastikan email service account sudah ditambahkan sebagai Editor di Google Sheet.',
        serviceEmail: getServiceAccountEmail(),
      },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true, title: result.title, sheetId })
}

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  return NextResponse.json({ serviceEmail: getServiceAccountEmail() })
}
