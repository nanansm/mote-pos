import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentMethods } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { newId } from '@/lib/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  code: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'kode hanya huruf kecil/angka/_'),
  label: z.string().min(1).max(64),
  type: z.enum(['cash', 'cashless', 'debt', 'deposit']),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).optional(),
})

export async function GET(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const url = new URL(req.url)
  const active = url.searchParams.get('active')

  const conds = [eq(paymentMethods.workspaceId, ctx.workspaceId)]
  if (active === 'true') conds.push(eq(paymentMethods.isActive, true))

  const rows = await db
    .select()
    .from(paymentMethods)
    .where(and(...conds))
    .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.label))

  return NextResponse.json({ data: rows })
}

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { code, label, type, isActive, sortOrder } = parsed.data

  const existing = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.workspaceId, ctx.workspaceId), eq(paymentMethods.code, code)))
    .limit(1)
  if (existing[0]) {
    return NextResponse.json({ error: 'Kode metode sudah dipakai' }, { status: 409 })
  }

  const id = newId()
  await db.insert(paymentMethods).values({
    id,
    workspaceId: ctx.workspaceId,
    code,
    label,
    type,
    isDefault: false,
    isActive,
    sortOrder: sortOrder ?? 100,
  })
  return NextResponse.json({ id })
}
