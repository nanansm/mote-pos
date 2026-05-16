import { NextResponse } from 'next/server'
import { and, eq, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { shiftSessions } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STALE_AFTER_HOURS = 24

function requireCronAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const header = req.headers.get('authorization')
  if (!header) return false
  // Constant-time compare
  const got = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (got.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < got.length; i++) {
    mismatch |= got.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

async function runAutoClose() {
  const cutoff = new Date(Date.now() - STALE_AFTER_HOURS * 60 * 60 * 1000)
  const stale = await db
    .select()
    .from(shiftSessions)
    .where(and(eq(shiftSessions.status, 'open'), lt(shiftSessions.openedAt, cutoff)))

  const results: { id: string; status: 'closed' | 'error'; error?: string }[] = []

  for (const shift of stale) {
    try {
      const cashAgg = await db.execute<{ cash_in: string }>(sql`
        SELECT COALESCE(SUM(CASE WHEN LOWER(tp.method) = 'cash' THEN tp.amount ELSE 0 END), 0)::numeric AS cash_in
        FROM mote_pos.transaction_payments tp
        JOIN mote_pos.transactions t ON tp.transaction_id = t.id
        WHERE t.shift_id = ${shift.id} AND t.status = 'completed'
      `)
      const cashIn = Number(cashAgg.rows[0]?.cash_in ?? 0)
      const opening = Number(shift.openingBalance ?? 0)
      const expected = opening + cashIn
      const durationHours = Math.floor(
        (Date.now() - new Date(shift.openedAt).getTime()) / (1000 * 60 * 60),
      )

      const updated = await db
        .update(shiftSessions)
        .set({
          status: 'closed',
          closedAt: new Date(),
          closingBalance: String(expected),
          expectedBalance: String(expected),
          difference: '0',
          autoClosed: true,
          closedReason: 'auto_closed_timeout',
          notes: `Auto-closed setelah ${durationHours} jam tanpa ditutup manual. Saldo akhir diasumsikan = expected, perlu verifikasi manual.`,
          updatedAt: new Date(),
        })
        .where(and(eq(shiftSessions.id, shift.id), eq(shiftSessions.status, 'open')))
        .returning({ id: shiftSessions.id })

      if (updated.length === 0) {
        // Lost a race; shift already closed.
        results.push({ id: shift.id, status: 'closed' })
        continue
      }

      await logAudit({
        workspaceId: shift.workspaceId,
        outletId: shift.outletId,
        shiftId: shift.id,
        cashierId: shift.cashierId,
        action: 'shift_auto_closed',
        entityType: 'shift_session',
        entityId: shift.id,
        metadata: {
          openedAt: shift.openedAt,
          durationHours,
          expectedBalance: expected,
          cashIn,
        },
      })

      results.push({ id: shift.id, status: 'closed' })
    } catch (err) {
      console.error('[cron/auto-close] failed for shift', shift.id, err)
      results.push({ id: shift.id, status: 'error', error: String(err) })
    }
  }

  return { processed: stale.length, results }
}

export async function GET(req: Request) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const out = await runAutoClose()
    return NextResponse.json({ ok: true, ...out })
  } catch (err) {
    console.error('[cron/auto-close] fatal', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
