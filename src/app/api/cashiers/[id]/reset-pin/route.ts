import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

const Body = z.object({ pin: z.string().regex(/^\d{6}$/) })

export async function POST(req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const pinHash = await bcrypt.hash(parsed.data.pin, 10)
  await db
    .update(cashiers)
    .set({ pinHash, updatedAt: new Date() })
    .where(and(eq(cashiers.id, id), eq(cashiers.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
