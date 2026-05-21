import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { Pool } from 'pg'

// Load .env.local first (overrides), then fall back to .env.
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true })
loadEnv()

const STUCK_HOURS = Number(process.env.REPAIR_STUCK_HOURS ?? 48)

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const pool = new Pool({ connectionString: url })

  try {
    // 1. Find all shifts status='open' older than N hours
    const stuck = await pool.query<{
      id: string
      cashier_id: string
      name: string
      opened_at: string
      opening_balance: string
      hours_open: string
    }>(
      `
      SELECT s.id, s.cashier_id, c.name, s.opened_at, s.opening_balance,
             EXTRACT(EPOCH FROM (NOW() - s.opened_at)) / 3600 AS hours_open
      FROM mote_pos.shift_sessions s
      JOIN mote_pos.cashiers c ON s.cashier_id = c.id
      WHERE s.status = 'open'
        AND s.opened_at < NOW() - ($1::int || ' hours')::interval
      ORDER BY s.opened_at ASC
      `,
      [STUCK_HOURS],
    )

    console.log(
      `[repair] found ${stuck.rowCount ?? 0} stuck shifts (>${STUCK_HOURS}h open)`,
    )

    for (const row of stuck.rows) {
      const hoursOpen = Number(row.hours_open ?? 0).toFixed(1)
      console.log(
        `[repair] closing: ${row.name} | opened ${hoursOpen}h ago | shift ${row.id}`,
      )

      // Calculate expected from cash transactions only
      const txAgg = await pool.query<{ cash_in: string }>(
        `
        SELECT COALESCE(SUM(CASE WHEN LOWER(tp.method) = 'cash' THEN tp.amount ELSE 0 END), 0)::numeric AS cash_in
        FROM mote_pos.transaction_payments tp
        JOIN mote_pos.transactions t ON tp.transaction_id = t.id
        WHERE t.shift_id = $1 AND t.status = 'completed'
        `,
        [row.id],
      )

      const cashIn = Number(txAgg.rows[0]?.cash_in ?? 0)
      const opening = Number(row.opening_balance ?? 0)
      const expected = opening + cashIn

      const updated = await pool.query(
        `
        UPDATE mote_pos.shift_sessions
        SET status = 'closed',
            closed_at = NOW(),
            closing_balance = $2::numeric,
            expected_balance = $2::numeric,
            difference = 0,
            auto_closed = true,
            closed_reason = 'manual_repair_stuck_shift',
            notes = COALESCE(notes, '') ||
                    CASE WHEN COALESCE(notes,'') = '' THEN '' ELSE E'\n' END ||
                    'Auto-repaired: shift stuck > ' || $3::int || ' hours. ' ||
                    'Closing balance set to expected (opening + cash_in).',
            updated_at = NOW()
        WHERE id = $1 AND status = 'open'
        RETURNING id
        `,
        [row.id, expected, STUCK_HOURS],
      )

      console.log(
        `[repair] closed shift ${row.id} closing_balance=${expected} updated_rows=${updated.rowCount}`,
      )
    }

    console.log('[repair] done')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[repair] fatal', err)
  process.exit(1)
})
