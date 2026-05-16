import { cookies } from 'next/headers'
import { and, eq, gt } from 'drizzle-orm'
import { db } from './db'
import {
  cashiers,
  cashierSessions,
  outlets,
  workspaces,
} from './db/schema'

export const CASHIER_COOKIE = 'cashier_session_token'
export const CASHIER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12 // 12 hours

export type CashierAuthContext = {
  cashierId: string
  cashierName: string
  cashierRole: 'cashier' | 'manager'
  workspaceId: string
  workspaceName: string
  outletId: string
  outletName: string
  shiftId: string | null
  sessionId: string
}

export async function getCashierSession(): Promise<CashierAuthContext | null> {
  const jar = await cookies()
  const token = jar.get(CASHIER_COOKIE)?.value
  if (!token) return null

  const rows = await db
    .select({
      sessionId: cashierSessions.id,
      cashierId: cashierSessions.cashierId,
      workspaceId: cashierSessions.workspaceId,
      outletId: cashierSessions.outletId,
      shiftId: cashierSessions.shiftId,
      cashierName: cashiers.name,
      cashierRole: cashiers.role,
      workspaceName: workspaces.name,
      outletName: outlets.name,
    })
    .from(cashierSessions)
    .innerJoin(cashiers, eq(cashiers.id, cashierSessions.cashierId))
    .innerJoin(workspaces, eq(workspaces.id, cashierSessions.workspaceId))
    .innerJoin(outlets, eq(outlets.id, cashierSessions.outletId))
    .where(and(eq(cashierSessions.token, token), gt(cashierSessions.expiresAt, new Date())))
    .limit(1)

  const r = rows[0]
  if (!r) return null
  return {
    sessionId: r.sessionId,
    cashierId: r.cashierId,
    cashierName: r.cashierName,
    cashierRole: r.cashierRole,
    workspaceId: r.workspaceId,
    workspaceName: r.workspaceName,
    outletId: r.outletId,
    outletName: r.outletName,
    shiftId: r.shiftId,
  }
}

export async function deleteCashierSession() {
  const jar = await cookies()
  const token = jar.get(CASHIER_COOKIE)?.value
  if (token) {
    await db.delete(cashierSessions).where(eq(cashierSessions.token, token))
  }
  jar.delete(CASHIER_COOKIE)
}
