import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, transactionItems, cashiers } from '@/lib/db/schema'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctxArg: Ctx) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx
  const { id } = await ctxArg.params

  const trx = await db
    .select({
      t: transactions,
      cashierName: cashiers.name,
    })
    .from(transactions)
    .innerJoin(cashiers, eq(cashiers.id, transactions.cashierId))
    .where(
      and(eq(transactions.id, id), eq(transactions.workspaceId, ctx.workspaceId)),
    )
    .limit(1)
  if (!trx[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id))

  return NextResponse.json({
    transaction: { ...trx[0].t, cashierName: trx[0].cashierName },
    items,
  })
}
