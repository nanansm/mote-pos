import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { cashiers, shiftSessions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

const Body = z.object({
  cashierId: z.string().min(1),
  pin: z.string().regex(/^\d{6}$/),
  openingBalance: z.number().min(0).optional(),
})

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const cashier = await db
    .select()
    .from(cashiers)
    .where(
      and(
        eq(cashiers.id, parsed.data.cashierId),
        eq(cashiers.workspaceId, ctx.workspaceId),
        eq(cashiers.isActive, true),
      ),
    )
    .limit(1)
  if (!cashier[0]) return NextResponse.json({ error: 'kasir tidak ditemukan' }, { status: 404 })

  const ok = await bcrypt.compare(parsed.data.pin, cashier[0].pinHash)
  if (!ok) return NextResponse.json({ error: 'PIN salah' }, { status: 401 })

  const existing = await db
    .select({ id: shiftSessions.id })
    .from(shiftSessions)
    .where(
      and(
        eq(shiftSessions.cashierId, cashier[0].id),
        eq(shiftSessions.status, 'open'),
      ),
    )
    .limit(1)
  if (existing[0]) {
    return NextResponse.json(
      { error: 'kasir ini masih punya shift terbuka', shiftId: existing[0].id },
      { status: 409 },
    )
  }

  const id = newId()
  await db.insert(shiftSessions).values({
    id,
    workspaceId: ctx.workspaceId,
    outletId: cashier[0].outletId,
    cashierId: cashier[0].id,
    openingBalance: String(parsed.data.openingBalance ?? 0),
    status: 'open',
  })

  return NextResponse.json({
    id,
    cashier: { id: cashier[0].id, name: cashier[0].name },
  })
}
