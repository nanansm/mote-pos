import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cashiers, cashierSessions, outlets } from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import {
  CASHIER_COOKIE,
  CASHIER_SESSION_MAX_AGE_SECONDS,
} from '@/lib/cashier-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  cashierId: z.string().min(1),
  pin: z.string().regex(/^\d{4,8}$/),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const { cashierId, pin } = parsed.data

  const rows = await db
    .select()
    .from(cashiers)
    .where(and(eq(cashiers.id, cashierId), eq(cashiers.isActive, true)))
    .limit(1)
  const c = rows[0]
  if (!c) {
    return NextResponse.json({ error: 'Kasir tidak ditemukan' }, { status: 404 })
  }

  const ok = await bcrypt.compare(pin, c.pinHash)
  if (!ok) {
    return NextResponse.json({ error: 'PIN salah' }, { status: 401 })
  }

  const outletRows = await db
    .select()
    .from(outlets)
    .where(eq(outlets.id, c.outletId))
    .limit(1)
  if (!outletRows[0]) {
    return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 404 })
  }

  const sessionId = newId()
  const token = newId() + newId()
  const expiresAt = new Date(Date.now() + CASHIER_SESSION_MAX_AGE_SECONDS * 1000)
  await db.insert(cashierSessions).values({
    id: sessionId,
    cashierId: c.id,
    workspaceId: c.workspaceId,
    outletId: c.outletId,
    token,
    expiresAt,
  })

  const jar = await cookies()
  jar.set(CASHIER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CASHIER_SESSION_MAX_AGE_SECONDS,
  })

  return NextResponse.json({
    ok: true,
    cashier: {
      id: c.id,
      name: c.name,
      role: c.role,
      workspaceId: c.workspaceId,
      outletId: c.outletId,
      outletName: outletRows[0].name,
    },
  })
}
