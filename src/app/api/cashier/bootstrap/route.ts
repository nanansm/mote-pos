import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { outlets, cashiers, workspaces } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const wsRows = await db.select().from(workspaces).orderBy(asc(workspaces.createdAt)).limit(1)
  const ws = wsRows[0]
  if (!ws) return NextResponse.json({ workspace: null, outlets: [] })

  const outletRows = await db
    .select()
    .from(outlets)
    .where(eq(outlets.workspaceId, ws.id))
    .orderBy(asc(outlets.name))

  const cashierRows = await db
    .select({
      id: cashiers.id,
      name: cashiers.name,
      role: cashiers.role,
      outletId: cashiers.outletId,
    })
    .from(cashiers)
    .where(eq(cashiers.workspaceId, ws.id))
    .orderBy(asc(cashiers.name))

  return NextResponse.json({
    workspace: { id: ws.id, name: ws.name },
    outlets: outletRows.map((o) => ({
      id: o.id,
      name: o.name,
      cashiers: cashierRows.filter((c) => c.outletId === o.id),
    })),
  })
}
