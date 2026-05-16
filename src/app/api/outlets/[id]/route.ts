import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { outlets } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

const Body = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(2000).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  printerIp: z.string().max(64).nullable().optional(),
  printerPort: z.number().int().min(1).max(65535).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const data = parsed.data
  if (ctx.cashierId) {
    const allowed: Partial<typeof data> = {}
    if (data.printerIp !== undefined) allowed.printerIp = data.printerIp
    if (data.printerPort !== undefined) allowed.printerPort = data.printerPort
    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'kasir hanya boleh ubah printer' }, { status: 403 })
    }
    await db
      .update(outlets)
      .set({ ...allowed, updatedAt: new Date() })
      .where(and(eq(outlets.id, id), eq(outlets.workspaceId, ctx.workspaceId)))
    return NextResponse.json({ ok: true })
  }

  await db
    .update(outlets)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(outlets.id, id), eq(outlets.workspaceId, ctx.workspaceId)))
  return NextResponse.json({ ok: true })
}
