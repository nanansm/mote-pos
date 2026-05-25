import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { buildReceiptData } from '@/lib/print/receipt-data'

export const runtime = 'nodejs'

const Body = z.object({ transactionId: z.string().min(1) })

// Returns a transaction's ReceiptData JSON for the native Bluetooth printer (APK).
export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  try {
    const receipt = await buildReceiptData(ctx.workspaceId, parsed.data.transactionId)
    return NextResponse.json(receipt)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'gagal ambil data struk'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
