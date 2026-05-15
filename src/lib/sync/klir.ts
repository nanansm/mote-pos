import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  workspaces,
  transactions,
  syncEvents,
  outlets,
  customerDebts,
  debtPayments,
} from '../db/schema'

const REQUEST_TIMEOUT_MS = 15_000

export type KlirSyncResult = {
  ok: boolean
  error?: string
  status?: number
  payload?: KlirBatchPayload
}

export type KlirItemsSummary = {
  category: string
  qty: number
  total: number
}

export type KlirBatchPayload = {
  source: 'mote_pos'
  workspaceId: string
  outletId: string | null
  date: string
  summary: {
    transactionCount: number
    totalSales: number
    totalCash: number
    totalQris: number
    totalTransfer: number
    totalHpp: number
    totalRefund: number
    totalVoid: number
    totalDebtCreated: number
    totalDebtPaid: number
  }
  itemsSummary: KlirItemsSummary[]
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export async function buildBatchPayload(workspaceId: string, date: Date): Promise<KlirBatchPayload> {
  const start = startOfDay(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  end.setMilliseconds(end.getMilliseconds() - 1)

  const outletRows = await db
    .select({ id: outlets.id })
    .from(outlets)
    .where(eq(outlets.workspaceId, workspaceId))
    .limit(1)
  const outletId = outletRows[0]?.id ?? null

  const trxRows = await db
    .select({
      total: transactions.total,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        gte(transactions.trxDate, start),
        lte(transactions.trxDate, end),
      ),
    )

  let totalSales = 0
  let totalCash = 0
  let totalQris = 0
  let totalTransfer = 0
  let totalRefund = 0
  let totalVoid = 0
  let completedCount = 0
  for (const t of trxRows) {
    const v = Number(t.total)
    if (t.status === 'completed') {
      completedCount++
      totalSales += v
      if (t.paymentMethod === 'cash') totalCash += v
      else if (t.paymentMethod === 'qris') totalQris += v
      else if (t.paymentMethod === 'transfer') totalTransfer += v
    } else if (t.status === 'refunded') {
      totalRefund += v
    } else if (t.status === 'voided') {
      totalVoid += v
    }
  }

  const agg = await db.execute<{ cat: string | null; qty: string; total: string; hpp: string }>(sql`
    SELECT COALESCE(c.name, 'Tanpa Kategori') AS cat,
           SUM(ti.quantity)::text AS qty,
           SUM(ti.subtotal)::text AS total,
           COALESCE(SUM(ti.quantity * COALESCE(p.price_cost, 0)), 0)::text AS hpp
    FROM mote_pos.transaction_items ti
    INNER JOIN mote_pos.transactions t ON t.id = ti.transaction_id
    LEFT JOIN mote_pos.products p ON p.id = ti.product_id
    LEFT JOIN mote_pos.categories c ON c.id = p.category_id
    WHERE t.workspace_id = ${workspaceId} AND t.status = 'completed'
      AND t.trx_date >= ${start} AND t.trx_date <= ${end}
    GROUP BY c.name
    ORDER BY SUM(ti.subtotal) DESC
  `)

  let totalHpp = 0
  const itemsSummary: KlirItemsSummary[] = []
  for (const r of agg.rows) {
    totalHpp += Number(r.hpp)
    itemsSummary.push({
      category: r.cat ?? 'Tanpa Kategori',
      qty: Number(r.qty),
      total: Number(r.total),
    })
  }

  const debtCreatedRows = await db
    .select({ amount: customerDebts.amount })
    .from(customerDebts)
    .where(
      and(
        eq(customerDebts.workspaceId, workspaceId),
        gte(customerDebts.createdAt, start),
        lte(customerDebts.createdAt, end),
      ),
    )
  const totalDebtCreated = debtCreatedRows.reduce((s, r) => s + Number(r.amount), 0)

  const debtPaidRows = await db.execute<{ total: string }>(sql`
    SELECT COALESCE(SUM(dp.amount), 0)::text AS total
    FROM mote_pos.debt_payments dp
    INNER JOIN mote_pos.customer_debts cd ON cd.id = dp.debt_id
    WHERE cd.workspace_id = ${workspaceId}
      AND dp.created_at >= ${start} AND dp.created_at <= ${end}
  `)
  const totalDebtPaid = Number(debtPaidRows.rows[0]?.total ?? 0)
  void debtPayments

  return {
    source: 'mote_pos',
    workspaceId,
    outletId,
    date: start.toISOString().slice(0, 10),
    summary: {
      transactionCount: completedCount,
      totalSales,
      totalCash,
      totalQris,
      totalTransfer,
      totalHpp,
      totalRefund,
      totalVoid,
      totalDebtCreated,
      totalDebtPaid,
    },
    itemsSummary,
  }
}

export async function syncBatchToKlir(workspaceId: string, date: Date): Promise<KlirSyncResult> {
  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  const ws = wsRows[0]
  if (!ws) return { ok: false, error: 'workspace not found' }
  if (!ws.klirSyncEnabled) return { ok: false, error: 'klir sync belum diaktifkan' }
  if (!ws.klirApiToken) return { ok: false, error: 'klir api token belum diset' }

  const url = process.env.KLIR_API_URL
  if (!url) return { ok: false, error: 'KLIR_API_URL belum diset di environment' }

  const payload = await buildBatchPayload(workspaceId, date)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/sync/pos-batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ws.klirApiToken}`,
        'x-mote-source': 'pos',
      },
      body: JSON.stringify({ ...payload, klirWorkspaceId: ws.klirWorkspaceId }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        status: res.status,
        error: `klir responded ${res.status}: ${text.slice(0, 200)}`,
        payload,
      }
    }
    await db
      .update(workspaces)
      .set({ klirLastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
    return { ok: true, status: res.status, payload }
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, error: `network error: ${msg}`, payload }
  }
}

export async function markSyncEventsAsSynced(workspaceId: string, date: Date) {
  const start = startOfDay(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  end.setMilliseconds(end.getMilliseconds() - 1)
  await db
    .update(syncEvents)
    .set({ status: 'synced', syncedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(syncEvents.workspaceId, workspaceId),
        eq(syncEvents.status, 'pending'),
        gte(syncEvents.createdAt, start),
        lte(syncEvents.createdAt, end),
      ),
    )
}

export async function markSyncEventsAsFailed(
  workspaceId: string,
  date: Date,
  error: string,
) {
  const start = startOfDay(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  end.setMilliseconds(end.getMilliseconds() - 1)
  await db
    .update(syncEvents)
    .set({
      lastError: error.slice(0, 500),
      retryCount: sql`${syncEvents.retryCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(syncEvents.workspaceId, workspaceId),
        eq(syncEvents.status, 'pending'),
        gte(syncEvents.createdAt, start),
        lte(syncEvents.createdAt, end),
      ),
    )
}
