import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cashiers, outlets, workspaces } from '@/lib/db/schema'
import { isValidCodeFormat } from '@/lib/workspace/login-code'
import { redis } from '@/lib/redis'
import { CashierLoginClient } from './client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_SEC = 60
const BLOCK_DURATION_SEC = 60 * 60

async function getClientIp(): Promise<string> {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  )
}

type BlockState = { blocked: boolean }

async function rateLimitCheck(ip: string, codeAttempt: string): Promise<BlockState> {
  const blockKey = `kpage:block:${ip}`
  const blocked = await redis.get(blockKey)
  if (blocked) return { blocked: true }

  const limitKey = `kpage:limit:${ip}`
  const count = await redis.incr(limitKey)
  if (count === 1) {
    await redis.expire(limitKey, RATE_LIMIT_WINDOW_SEC)
  }
  if (count > RATE_LIMIT_MAX) {
    await redis.set(blockKey, '1', 'EX', BLOCK_DURATION_SEC)
    console.warn(
      `[rate-limit] /k/* blocked ip=${ip} code=${codeAttempt} count=${count}`,
    )
    return { blocked: true }
  }
  return { blocked: false }
}

function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Akses Diblokir Sementara</h1>
        <p className="text-sm text-muted-foreground">
          Terlalu banyak permintaan dari jaringan ini. Coba lagi dalam 1 jam.
        </p>
      </div>
    </div>
  )
}

export default async function CashierLoginPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: codeRaw } = await params
  const code = codeRaw.toUpperCase()

  const ip = await getClientIp()
  const { blocked } = await rateLimitCheck(ip, code)
  if (blocked) return <BlockedPage />

  if (!isValidCodeFormat(code)) {
    notFound()
  }

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.loginCode, code),
  })

  if (!ws) notFound()

  const outletList = await db
    .select()
    .from(outlets)
    .where(and(eq(outlets.workspaceId, ws.id), eq(outlets.isActive, true)))
    .orderBy(asc(outlets.name))

  const cashierList = await db
    .select({
      id: cashiers.id,
      name: cashiers.name,
      role: cashiers.role,
      isOwnerCashier: cashiers.isOwnerCashier,
      outletId: cashiers.outletId,
    })
    .from(cashiers)
    .where(and(eq(cashiers.workspaceId, ws.id), eq(cashiers.isActive, true)))
    .orderBy(asc(cashiers.name))

  return (
    <CashierLoginClient
      workspace={{ id: ws.id, name: ws.name, businessType: ws.businessType }}
      outlets={outletList.map((o) => ({
        id: o.id,
        name: o.name,
        address: o.address ?? '',
      }))}
      cashiers={cashierList.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        isOwnerCashier: c.isOwnerCashier,
        outletId: c.outletId,
      }))}
      loginCode={code}
    />
  )
}
