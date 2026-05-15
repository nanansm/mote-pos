import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, asc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export async function GET() {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const rows = await db
    .select({
      id: cashiers.id,
      name: cashiers.name,
      role: cashiers.role,
      isActive: cashiers.isActive,
      outletId: cashiers.outletId,
      createdAt: cashiers.createdAt,
    })
    .from(cashiers)
    .where(eq(cashiers.workspaceId, ctx.workspaceId))
    .orderBy(asc(cashiers.name))
  return NextResponse.json({ data: rows })
}

const Body = z.object({
  name: z.string().min(1).max(120),
  pin: z.string().regex(/^\d{6}$/),
  role: z.enum(['cashier', 'manager']).optional(),
  isActive: z.boolean().optional(),
})

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const existing = await db
    .select({ id: cashiers.id })
    .from(cashiers)
    .where(
      and(
        eq(cashiers.workspaceId, ctx.workspaceId),
        eq(cashiers.outletId, ctx.outletId),
        eq(cashiers.name, parsed.data.name),
      ),
    )
    .limit(1)
  if (existing[0]) {
    return NextResponse.json({ error: 'name already used' }, { status: 409 })
  }

  const id = newId()
  const pinHash = await bcrypt.hash(parsed.data.pin, 10)
  await db.insert(cashiers).values({
    id,
    workspaceId: ctx.workspaceId,
    outletId: ctx.outletId,
    name: parsed.data.name,
    pinHash,
    role: parsed.data.role ?? 'cashier',
    isActive: parsed.data.isActive ?? true,
  })
  return NextResponse.json({ id })
}
