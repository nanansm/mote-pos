import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { DEFAULT_PAYMENT_LABELS } from '@/lib/payment-methods/labels'

export interface PaymentBreakdownItem {
  method: string
  label: string
  amount: number
  count: number
}

export interface ShiftPaymentSummary {
  breakdown: PaymentBreakdownItem[]
  total: number
  txCount: number
  cashIn: number
}

const DEFAULT_ORDER: ReadonlyArray<string> = [
  'cash',
  'qris',
  'transfer',
  'debt',
  'deposit',
]

function methodOrder(method: string): number {
  const idx = DEFAULT_ORDER.indexOf(method)
  return idx === -1 ? DEFAULT_ORDER.length + 1 : idx
}

/**
 * Aggregates payment amounts for a single shift by reading
 * `transaction_payments` joined to completed transactions. Always returns the
 * five default methods (cash, qris, transfer, debt, deposit) — including those
 * with amount=0 — plus any custom workspace payment methods that were used.
 */
export async function getShiftPaymentSummary(
  shiftId: string,
  workspaceId?: string,
): Promise<ShiftPaymentSummary> {
  // Payment-method labels for this workspace (for custom methods).
  const labelRows = workspaceId
    ? await db.execute<{ code: string; label: string }>(sql`
        SELECT code, label
        FROM mote_pos.payment_methods
        WHERE workspace_id = ${workspaceId}
      `)
    : { rows: [] as { code: string; label: string }[] }
  const customLabels = new Map<string, string>()
  for (const r of labelRows.rows) {
    customLabels.set(String(r.code).toLowerCase(), r.label)
  }

  const breakdownRows = await db.execute<{
    method: string
    amount: string
    count: number
  }>(sql`
    SELECT
      LOWER(tp.method) AS method,
      COALESCE(SUM(tp.amount), 0)::numeric AS amount,
      COUNT(DISTINCT tp.transaction_id)::int AS count
    FROM mote_pos.transaction_payments tp
    JOIN mote_pos.transactions t ON tp.transaction_id = t.id
    WHERE t.shift_id = ${shiftId}
      AND t.status = 'completed'
    GROUP BY LOWER(tp.method)
  `)

  const totalsRow = await db.execute<{ cnt: number; total: string }>(sql`
    SELECT
      COUNT(*)::int AS cnt,
      COALESCE(SUM(total), 0)::numeric AS total
    FROM mote_pos.transactions
    WHERE shift_id = ${shiftId} AND status = 'completed'
  `)

  const txCount = Number(totalsRow.rows[0]?.cnt ?? 0)
  const total = Number(totalsRow.rows[0]?.total ?? 0)

  const usedMethods = new Map<string, { amount: number; count: number }>()
  for (const r of breakdownRows.rows) {
    usedMethods.set(r.method, {
      amount: Number(r.amount),
      count: Number(r.count),
    })
  }

  const allMethods = new Set<string>([
    ...DEFAULT_ORDER,
    ...usedMethods.keys(),
  ])

  const breakdown: PaymentBreakdownItem[] = Array.from(allMethods)
    .map((method) => {
      const v = usedMethods.get(method)
      return {
        method,
        label:
          customLabels.get(method) ??
          DEFAULT_PAYMENT_LABELS[method] ??
          method.toUpperCase(),
        amount: v?.amount ?? 0,
        count: v?.count ?? 0,
      }
    })
    .sort((a, b) => {
      const oa = methodOrder(a.method)
      const ob = methodOrder(b.method)
      if (oa !== ob) return oa - ob
      return a.label.localeCompare(b.label)
    })

  const cashIn = usedMethods.get('cash')?.amount ?? 0

  return { breakdown, total, txCount, cashIn }
}
