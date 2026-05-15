import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { requireOwner } from '@/lib/owner-guard'

export const runtime = 'nodejs'

const Body = z.object({ role: z.enum(['user', 'owner']) })

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireOwner()
  const { id } = await params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const res = await db
    .update(user)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning({ id: user.id, role: user.role })
  if (!res[0]) return NextResponse.json({ error: 'user not found' }, { status: 404 })
  return NextResponse.json(res[0])
}
