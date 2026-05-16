import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { user as userTable, workspaces, outlets } from './db/schema'
import { getSession } from './session'
import { getCashierSession } from './cashier-auth'

type DbUser = typeof userTable.$inferSelect
type DbWorkspace = typeof workspaces.$inferSelect
type DbOutlet = typeof outlets.$inferSelect

export type UserAuthContext = {
  type: 'user'
  user: DbUser
  workspace: DbWorkspace
  outlet: DbOutlet | null
  isWorkspaceOwner: boolean
}

export type CashierAuthContextResolved = {
  type: 'cashier'
  cashierId: string
  cashierName: string
  cashierRole: 'cashier' | 'manager'
  shiftId: string | null
  workspace: DbWorkspace
  outlet: DbOutlet
  isWorkspaceOwner: false
}

export type AuthContext = UserAuthContext | CashierAuthContextResolved

export async function getAuthContext(): Promise<AuthContext | null> {
  const sess = await getSession()
  if (sess?.user) {
    const userRows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, sess.user.id))
      .limit(1)
    const u = userRows[0]
    if (!u?.workspaceId) return null

    const wsRows = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, u.workspaceId))
      .limit(1)
    const ws = wsRows[0]
    if (!ws) return null

    const outletRows = await db
      .select()
      .from(outlets)
      .where(eq(outlets.workspaceId, ws.id))
      .limit(1)

    return {
      type: 'user',
      user: u,
      workspace: ws,
      outlet: outletRows[0] ?? null,
      isWorkspaceOwner: ws.ownerId === u.id,
    }
  }

  const cashier = await getCashierSession()
  if (cashier) {
    const wsRows = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, cashier.workspaceId))
      .limit(1)
    const ws = wsRows[0]
    if (!ws) return null
    const outletRows = await db
      .select()
      .from(outlets)
      .where(eq(outlets.id, cashier.outletId))
      .limit(1)
    const outlet = outletRows[0]
    if (!outlet) return null
    return {
      type: 'cashier',
      cashierId: cashier.cashierId,
      cashierName: cashier.cashierName,
      cashierRole: cashier.cashierRole,
      shiftId: cashier.shiftId,
      workspace: ws,
      outlet,
      isWorkspaceOwner: false,
    }
  }

  return null
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')
  return ctx
}

export async function requireUser(): Promise<UserAuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')
  if (ctx.type !== 'user') redirect('/kasir')
  return ctx
}

export function isCashier(
  ctx: AuthContext | null,
): ctx is CashierAuthContextResolved {
  return ctx?.type === 'cashier'
}
