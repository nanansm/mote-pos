import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cashierSessions, workspaces } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/session'
import { generateLoginCode } from '@/lib/workspace/login-code'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !user.workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, user.workspaceId),
  })
  if (!ws) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }
  if (ws.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ login_code: ws.loginCode ?? null })
}

export async function POST() {
  const user = await getCurrentUser()
  if (!user || !user.workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, user.workspaceId),
  })
  if (!ws) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }
  if (ws.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let newCode = ''
  let attempts = 0
  while (true) {
    newCode = generateLoginCode(ws.name)
    const exists = await db.query.workspaces.findFirst({
      where: eq(workspaces.loginCode, newCode),
    })
    if (!exists) break
    attempts++
    if (attempts > 20) {
      return NextResponse.json(
        { error: 'Gagal generate kode unik, coba lagi.' },
        { status: 500 },
      )
    }
  }

  const oldCode = ws.loginCode

  await db.transaction(async (tx) => {
    await tx
      .update(workspaces)
      .set({ loginCode: newCode, updatedAt: new Date() })
      .where(eq(workspaces.id, ws.id))
    await tx
      .delete(cashierSessions)
      .where(eq(cashierSessions.workspaceId, ws.id))
  })

  await logAudit({
    workspaceId: ws.id,
    userId: user.id,
    action: 'workspace_code_regenerated',
    metadata: { old_code: oldCode, new_code: newCode },
  })

  return NextResponse.json({ login_code: newCode })
}
