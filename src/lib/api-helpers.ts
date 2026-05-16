import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { user as userTable, workspaces, outlets } from './db/schema'
import { getSession } from './session'
import { getCashierSession } from './cashier-auth'

export type AuthCtx = {
  userId: string | null
  workspaceId: string
  outletId: string
  cashierId?: string | null
}

export async function requireAuthCtx(): Promise<AuthCtx | NextResponse> {
  const sess = await getSession()
  if (sess?.user) {
    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, sess.user.id))
      .limit(1)
    const u = rows[0]
    if (!u?.workspaceId) {
      return NextResponse.json({ error: 'no workspace' }, { status: 403 })
    }
    const ws = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, u.workspaceId))
      .limit(1)
    if (!ws[0]) {
      return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
    }
    const outletRows = await db
      .select()
      .from(outlets)
      .where(eq(outlets.workspaceId, u.workspaceId))
      .limit(1)
    const outletId = outletRows[0]?.id
    if (!outletId) {
      return NextResponse.json({ error: 'no outlet' }, { status: 403 })
    }
    return { userId: sess.user.id, workspaceId: u.workspaceId, outletId }
  }

  const cashier = await getCashierSession()
  if (cashier) {
    return {
      userId: null,
      workspaceId: cashier.workspaceId,
      outletId: cashier.outletId,
      cashierId: cashier.cashierId,
    }
  }

  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

export function isErrResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}

/**
 * Same as requireAuthCtx but rejects cashier sessions with 403.
 * Use for mutation endpoints that only the workspace owner should hit
 * (product/category/modifier/payment_method writes, workspace settings,
 * etc.) so a cashier can't bypass UI restrictions via direct fetch.
 */
export async function requireUserCtx(): Promise<AuthCtx | NextResponse> {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  if (!ctx.userId) {
    return NextResponse.json(
      { error: 'forbidden: requires workspace owner' },
      { status: 403 },
    )
  }
  return ctx
}
