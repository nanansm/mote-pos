import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { modifierGroups, modifierOptions } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

const Body = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(120),
  priceAdd: z.number().min(0).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const grp = await db
    .select({ id: modifierGroups.id })
    .from(modifierGroups)
    .where(
      and(
        eq(modifierGroups.id, parsed.data.groupId),
        eq(modifierGroups.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1)
  if (!grp[0]) return NextResponse.json({ error: 'group not found' }, { status: 404 })

  const id = newId()
  await db.insert(modifierOptions).values({
    id,
    groupId: parsed.data.groupId,
    name: parsed.data.name,
    priceAdd: String(parsed.data.priceAdd ?? 0),
    sortOrder: parsed.data.sortOrder ?? 0,
    isActive: parsed.data.isActive ?? true,
  })
  return NextResponse.json({ id })
}
