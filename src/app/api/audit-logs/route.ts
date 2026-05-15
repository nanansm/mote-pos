import { NextResponse } from 'next/server'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLogs, cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const cashierId = url.searchParams.get('cashier_id')
  const fromStr = url.searchParams.get('from')
  const toStr = url.searchParams.get('to')
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? 200)))

  const conds = [eq(auditLogs.workspaceId, ctx.workspaceId)]
  if (action) conds.push(eq(auditLogs.action, action))
  if (cashierId) conds.push(eq(auditLogs.cashierId, cashierId))
  if (fromStr) {
    const d = new Date(fromStr)
    if (!isNaN(d.getTime())) conds.push(gte(auditLogs.createdAt, d))
  }
  if (toStr) {
    const d = new Date(toStr)
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      conds.push(lte(auditLogs.createdAt, d))
    }
  }

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      cashierName: cashiers.name,
      cashierId: auditLogs.cashierId,
    })
    .from(auditLogs)
    .leftJoin(cashiers, eq(cashiers.id, auditLogs.cashierId))
    .where(and(...conds))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)

  return NextResponse.json({ data: rows })
}
