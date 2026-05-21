import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cashiers, cashierSessions, outlets, workspaces } from '@/lib/db/schema'
import { newId } from '@/lib/ids'
import { redis } from '@/lib/redis'
import { isValidCodeFormat } from '@/lib/workspace/login-code'
import { logAudit } from '@/lib/audit'
import {
  CASHIER_COOKIE,
  CASHIER_SESSION_MAX_AGE_SECONDS,
} from '@/lib/cashier-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MAX = Number(process.env.CASHIER_LOGIN_RATE_LIMIT_MAX ?? 10)
const RATE_LIMIT_WINDOW_SEC = Number(
  process.env.CASHIER_LOGIN_RATE_LIMIT_WINDOW_SEC ?? 60,
)
const BLOCK_DURATION_SEC = Number(
  process.env.CASHIER_LOGIN_BLOCK_DURATION_SEC ?? 60 * 60,
)

const Body = z.object({
  login_code: z.string().min(1),
  cashier_id: z.string().min(1),
  pin: z.string().regex(/^\d{4,8}$/),
})

async function getClientIp() {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: Request) {
  const ip = await getClientIp()

  const blockKey = `cashier-login:block:${ip}`
  const blocked = await redis.get(blockKey)
  if (blocked) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login. Coba lagi dalam 1 jam.' },
      { status: 429 },
    )
  }

  const limitKey = `cashier-login:limit:${ip}`
  const count = await redis.incr(limitKey)
  if (count === 1) await redis.expire(limitKey, RATE_LIMIT_WINDOW_SEC)
  if (count > RATE_LIMIT_MAX) {
    await redis.set(blockKey, '1', 'EX', BLOCK_DURATION_SEC)
    console.warn(`[rate-limit] /api/cashier/login blocked ip=${ip} count=${count}`)
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login. Coba lagi dalam 1 jam.' },
      { status: 429 },
    )
  }

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }
  const { login_code, cashier_id, pin } = parsed.data
  const loginCode = login_code.toUpperCase()

  if (!isValidCodeFormat(loginCode)) {
    return NextResponse.json({ error: 'Format kode tidak valid' }, { status: 400 })
  }

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.loginCode, loginCode),
  })
  if (!ws) {
    return NextResponse.json(
      { error: 'Kode workspace tidak ditemukan' },
      { status: 404 },
    )
  }

  const cashierRows = await db
    .select()
    .from(cashiers)
    .where(
      and(
        eq(cashiers.id, cashier_id),
        eq(cashiers.workspaceId, ws.id),
        eq(cashiers.isActive, true),
      ),
    )
    .limit(1)
  const c = cashierRows[0]
  if (!c) {
    await logAudit({
      workspaceId: ws.id,
      action: 'cashier_login_failed',
      metadata: { reason: 'cashier_not_found', cashier_id, ip },
    })
    return NextResponse.json({ error: 'Kasir tidak ditemukan' }, { status: 404 })
  }

  const ok = await bcrypt.compare(pin, c.pinHash)
  if (!ok) {
    await logAudit({
      workspaceId: ws.id,
      cashierId: c.id,
      action: 'cashier_login_failed',
      metadata: { reason: 'invalid_pin', ip },
    })
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

  await logAudit({
    workspaceId: ws.id,
    outletId: c.outletId,
    cashierId: c.id,
    action: 'cashier_login',
    metadata: { ip, login_code: loginCode },
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
