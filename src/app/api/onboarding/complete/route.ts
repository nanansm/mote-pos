import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import {
  user as userTable,
  workspaces,
  outlets,
  cashiers,
} from '@/lib/db/schema'
import { newId } from '@/lib/ids'

const Body = z.object({
  workspace: z.object({
    name: z.string().min(1).max(120),
    businessType: z.enum(['resto', 'retail', 'jasa']),
    address: z.string().optional().default(''),
    phone: z.string().optional().default(''),
  }),
  outlet: z.object({
    name: z.string().min(1).max(120),
    address: z.string().optional().default(''),
    printerIp: z.string().optional().default(''),
  }),
  cashier: z.object({
    name: z.string().min(1).max(120),
    pin: z.string().regex(/^\d{6}$/),
  }),
})

export async function POST(req: Request) {
  const sess = await getSession()
  if (!sess?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  const me = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, sess.user.id))
    .limit(1)
  if (me[0]?.workspaceId) {
    return NextResponse.json({ error: 'workspace already exists' }, { status: 409 })
  }

  const { workspace, outlet, cashier } = parsed.data
  const wsId = newId()
  const outletId = newId()
  const cashierId = newId()
  const pinHash = await bcrypt.hash(cashier.pin, 10)

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: wsId,
      ownerId: sess.user.id,
      name: workspace.name,
      address: workspace.address || null,
      phone: workspace.phone || null,
      businessType: workspace.businessType,
    })
    await tx.insert(outlets).values({
      id: outletId,
      workspaceId: wsId,
      name: outlet.name,
      address: outlet.address || null,
      printerIp: outlet.printerIp || null,
    })
    await tx.insert(cashiers).values({
      id: cashierId,
      workspaceId: wsId,
      outletId,
      name: cashier.name,
      pinHash,
      role: 'manager',
      isOwnerCashier: true,
    })
    await tx.update(userTable).set({ workspaceId: wsId }).where(eq(userTable.id, sess.user.id))
  })

  return NextResponse.json({ ok: true, workspaceId: wsId })
}
