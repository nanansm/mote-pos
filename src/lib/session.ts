import { headers } from 'next/headers'
import { auth } from './auth'
import { db } from './db'
import { user as userTable, workspaces, outlets } from './db/schema'
import { eq } from 'drizzle-orm'

export async function getSession() {
  return await auth.api.getSession({ headers: await headers() })
}

export async function getCurrentUser() {
  const sess = await getSession()
  if (!sess?.user) return null
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, sess.user.id))
    .limit(1)
  return rows[0] ?? null
}

export async function getCurrentContext() {
  const sess = await getSession()
  if (!sess?.user) return null

  const userRows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, sess.user.id))
    .limit(1)
  const u = userRows[0]
  if (!u) return null

  if (!u.workspaceId) return { user: u, workspace: null, outlet: null }

  const wsRows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, u.workspaceId))
    .limit(1)
  const ws = wsRows[0]
  if (!ws) return { user: u, workspace: null, outlet: null }

  const outletRows = await db
    .select()
    .from(outlets)
    .where(eq(outlets.workspaceId, ws.id))
    .limit(1)

  return { user: u, workspace: ws, outlet: outletRows[0] ?? null }
}
