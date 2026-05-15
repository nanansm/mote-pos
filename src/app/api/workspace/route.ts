import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(2000).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  businessType: z.enum(['resto', 'retail', 'jasa']).optional(),
})

export async function PUT(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  await db
    .update(workspaces)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(workspaces.id, ctx.workspaceId))
  return NextResponse.json({ ok: true })
}
