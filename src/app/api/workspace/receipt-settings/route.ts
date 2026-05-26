import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  autoPrintReceipt: z.boolean().optional(),
  autoPrintShiftReport: z.boolean().optional(),
  receiptPaperSize: z.enum(['58mm', '80mm']).optional(),
  receiptNote: z.string().max(500).nullable().optional(),
  receiptShowPhone: z.boolean().optional(),
  receiptShowAddress: z.boolean().optional(),
  receiptShowCashier: z.boolean().optional(),
  receiptShowTrxNo: z.boolean().optional(),
})

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const rows = await db
    .select({
      autoPrintReceipt: workspaces.autoPrintReceipt,
      autoPrintShiftReport: workspaces.autoPrintShiftReport,
      receiptPaperSize: workspaces.receiptPaperSize,
      receiptNote: workspaces.receiptNote,
      receiptShowPhone: workspaces.receiptShowPhone,
      receiptShowAddress: workspaces.receiptShowAddress,
      receiptShowCashier: workspaces.receiptShowCashier,
      receiptShowTrxNo: workspaces.receiptShowTrxNo,
      workspaceName: workspaces.name,
      workspacePhone: workspaces.phone,
      workspaceAddress: workspaces.address,
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
  if (parsed.data.autoPrintReceipt !== undefined) updates.autoPrintReceipt = parsed.data.autoPrintReceipt
  if (parsed.data.autoPrintShiftReport !== undefined)
    updates.autoPrintShiftReport = parsed.data.autoPrintShiftReport
  if (parsed.data.receiptPaperSize !== undefined)
    updates.receiptPaperSize = parsed.data.receiptPaperSize
  if (parsed.data.receiptNote !== undefined)
    updates.receiptNote = parsed.data.receiptNote ?? null
  if (parsed.data.receiptShowPhone !== undefined)
    updates.receiptShowPhone = parsed.data.receiptShowPhone
  if (parsed.data.receiptShowAddress !== undefined)
    updates.receiptShowAddress = parsed.data.receiptShowAddress
  if (parsed.data.receiptShowCashier !== undefined)
    updates.receiptShowCashier = parsed.data.receiptShowCashier
  if (parsed.data.receiptShowTrxNo !== undefined)
    updates.receiptShowTrxNo = parsed.data.receiptShowTrxNo

  await db.update(workspaces).set(updates).where(eq(workspaces.id, ctx.workspaceId))
  return NextResponse.json({ ok: true })
}
