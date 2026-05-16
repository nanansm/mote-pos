import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAuthCtx, isErrResponse } from '@/lib/api-helpers'
import { logAudit } from '@/lib/audit'

const Body = z.object({
  shiftId: z.string().min(1),
  closingBalance: z.number().min(0),
  notes: z.string().max(2000).optional(),
})

type ShiftRow = {
  id: string
  workspace_id: string
  cashier_id: string
  outlet_id: string
  opening_balance: string | number
  status: 'open' | 'closed'
  closing_balance: string | number | null
  expected_balance: string | number | null
  difference: string | number | null
  opened_at: Date
  closed_at: Date | null
  notes: string | null
  closed_reason: string | null
}

export async function POST(req: Request) {
  const ctx = await requireAuthCtx()
  if (isErrResponse(ctx)) return ctx

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const { shiftId, closingBalance, notes } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      const lockRes = await tx.execute<ShiftRow>(sql`
        SELECT id, workspace_id, cashier_id, outlet_id, opening_balance,
               status, closing_balance, expected_balance, difference,
               opened_at, closed_at, notes, closed_reason
        FROM mote_pos.shift_sessions
        WHERE id = ${shiftId}
        FOR UPDATE
      `)

      const shift = lockRes.rows[0]
      if (!shift) return { kind: 'not_found' as const }

      if (shift.workspace_id !== ctx.workspaceId) {
        return { kind: 'forbidden' as const }
      }
      if (ctx.cashierId && shift.cashier_id !== ctx.cashierId) {
        return { kind: 'forbidden' as const }
      }

      // Idempotent: shift already closed → return the existing row.
      if (shift.status === 'closed') {
        return { kind: 'already_closed' as const, shift }
      }

      // Compute cash_in from transaction_payments (handles split cash too).
      const cashAgg = await tx.execute<{ cash_in: string }>(sql`
        SELECT COALESCE(SUM(CASE WHEN LOWER(tp.method) = 'cash' THEN tp.amount ELSE 0 END), 0)::numeric AS cash_in
        FROM mote_pos.transaction_payments tp
        JOIN mote_pos.transactions t ON tp.transaction_id = t.id
        WHERE t.shift_id = ${shiftId}
          AND t.status = 'completed'
      `)
      const cashIn = Number(cashAgg.rows[0]?.cash_in ?? 0)
      const opening = Number(shift.opening_balance ?? 0)
      const expected = opening + cashIn
      const difference = closingBalance - expected

      const updateRes = await tx.execute<ShiftRow>(sql`
        UPDATE mote_pos.shift_sessions
        SET status = 'closed',
            closed_at = NOW(),
            closing_balance = ${String(closingBalance)},
            expected_balance = ${String(expected)},
            difference = ${String(difference)},
            notes = ${notes ?? null},
            closed_reason = 'manual',
            updated_at = NOW()
        WHERE id = ${shiftId} AND status = 'open'
        RETURNING id, workspace_id, cashier_id, outlet_id, opening_balance,
                  status, closing_balance, expected_balance, difference,
                  opened_at, closed_at, notes, closed_reason
      `)

      const updated = updateRes.rows[0]
      if (!updated) {
        // Lost the race — someone else closed it between SELECT and UPDATE.
        return { kind: 'already_closed' as const, shift }
      }

      return {
        kind: 'closed' as const,
        shift: updated,
        cashIn,
        expected,
        difference,
      }
    })

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'shift not found' }, { status: 404 })
    }
    if (result.kind === 'forbidden') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    if (result.kind === 'already_closed') {
      return NextResponse.json({
        ok: true,
        alreadyClosed: true,
        shiftId: result.shift.id,
        closingBalance: Number(result.shift.closing_balance ?? 0),
        expectedBalance: Number(result.shift.expected_balance ?? 0),
        difference: Number(result.shift.difference ?? 0),
      })
    }

    // Audit log + sync event outside the transaction.
    await logAudit({
      workspaceId: ctx.workspaceId,
      outletId: result.shift.outlet_id,
      shiftId: result.shift.id,
      cashierId: ctx.cashierId ?? result.shift.cashier_id,
      userId: ctx.userId,
      action: 'shift_closed',
      entityType: 'shift_session',
      entityId: result.shift.id,
      metadata: {
        closingBalance,
        expectedBalance: result.expected,
        difference: result.difference,
        cashIn: result.cashIn,
        closedBy: ctx.userId ? 'user' : 'cashier',
      },
    })

    return NextResponse.json({
      ok: true,
      alreadyClosed: false,
      shiftId: result.shift.id,
      closingBalance,
      expectedBalance: result.expected,
      difference: result.difference,
      cashIn: result.cashIn,
    })
  } catch (err) {
    console.error('[shifts/close] error', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
