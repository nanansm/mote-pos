import { NextResponse } from 'next/server'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { importProductsFromSheet } from '@/lib/google-sheets/import-products'

export const runtime = 'nodejs'

export async function POST() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const result = await importProductsFromSheet(ctx.workspaceId)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json(result)
}
