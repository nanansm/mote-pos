import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { modifierGroups, modifierOptions } from '@/lib/db/schema'
import { requireAuthCtx, requireUserCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx

  const groups = await db
    .select()
    .from(modifierGroups)
    .where(eq(modifierGroups.workspaceId, ctx.workspaceId))
    .orderBy(asc(modifierGroups.name))

  const ids = groups.map((g) => g.id)
  const options = ids.length
    ? await db
        .select()
        .from(modifierOptions)
        .orderBy(asc(modifierOptions.sortOrder), asc(modifierOptions.name))
    : []
  const optionsByGroup = new Map<string, typeof options>()
  for (const o of options) {
    const list = optionsByGroup.get(o.groupId) ?? []
    list.push(o)
    optionsByGroup.set(o.groupId, list)
  }
  return NextResponse.json({
    data: groups.map((g) => ({ ...g, options: optionsByGroup.get(g.id) ?? [] })),
  })
}

const Body = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['single', 'multiple']).optional(),
  isRequired: z.boolean().optional(),
  minSelect: z.number().int().min(0).max(50).optional(),
  maxSelect: z.number().int().min(1).max(50).optional(),
})

export async function POST(req: Request) {
  const ctx = await requireUserCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const id = newId()
  await db.insert(modifierGroups).values({
    id,
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    type: parsed.data.type ?? 'single',
    isRequired: parsed.data.isRequired ?? false,
    minSelect: parsed.data.minSelect ?? 0,
    maxSelect: parsed.data.maxSelect ?? 1,
  })
  return NextResponse.json({ id })
}
