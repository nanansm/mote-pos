import 'dotenv/config'
import { Pool } from 'pg'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const pool = new Pool({ connectionString: url })

  try {
    // 1. status=open but closed_at NOT NULL → fix status
    const fixed = await pool.query<{ id: string }>(`
      UPDATE mote_pos.shift_sessions
      SET status = 'closed',
          closed_reason = COALESCE(closed_reason, 'data_repair'),
          updated_at = NOW()
      WHERE status = 'open' AND closed_at IS NOT NULL
      RETURNING id
    `)
    console.log(
      `[cleanup] fixed ${fixed.rowCount ?? 0} shifts with status=open but closed_at NOT NULL`,
    )

    // 2. ghost shifts: closed_at IS NOT NULL, duration < 60s, opening=0, closing=0
    const ghosts = await pool.query<{ id: string }>(`
      SELECT id
      FROM mote_pos.shift_sessions
      WHERE status = 'closed'
        AND closed_at IS NOT NULL
        AND opened_at IS NOT NULL
        AND COALESCE(closing_balance, 0) = 0
        AND COALESCE(opening_balance, 0) = 0
        AND EXTRACT(EPOCH FROM (closed_at - opened_at)) < 60
        AND (closed_reason IS NULL OR closed_reason = 'manual')
    `)
    console.log(`[cleanup] found ${ghosts.rowCount ?? 0} ghost shifts (duration < 60s, balance 0)`)

    if (ghosts.rowCount && ghosts.rowCount > 0) {
      const ids = ghosts.rows.map((r) => r.id)
      await pool.query(
        `UPDATE mote_pos.shift_sessions
         SET closed_reason = 'ghost_shift_data_repair', updated_at = NOW()
         WHERE id = ANY($1::text[])`,
        [ids],
      )
      console.log(`[cleanup] marked ${ids.length} ghost shifts with closed_reason='ghost_shift_data_repair'`)
    }

    // 3. multiple open shifts per cashier → keep newest, close older
    const dups = await pool.query<{ cashier_id: string; cnt: string }>(`
      SELECT cashier_id, COUNT(*)::int AS cnt
      FROM mote_pos.shift_sessions
      WHERE status = 'open'
      GROUP BY cashier_id
      HAVING COUNT(*) > 1
    `)
    console.log(`[cleanup] found ${dups.rowCount ?? 0} cashiers with multiple open shifts`)

    for (const row of dups.rows) {
      const cashierId = row.cashier_id
      const closed = await pool.query(
        `UPDATE mote_pos.shift_sessions
         SET status = 'closed',
             closed_at = NOW(),
             closing_balance = COALESCE(closing_balance, 0),
             closed_reason = 'duplicate_open_repair',
             updated_at = NOW()
         WHERE cashier_id = $1
           AND status = 'open'
           AND id <> (
             SELECT id FROM mote_pos.shift_sessions
             WHERE cashier_id = $1 AND status = 'open'
             ORDER BY opened_at DESC
             LIMIT 1
           )
         RETURNING id`,
        [cashierId],
      )
      console.log(
        `[cleanup] cashier ${cashierId}: closed ${closed.rowCount ?? 0} older open shifts`,
      )
    }

    console.log('[cleanup] done')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[cleanup] fatal', err)
  process.exit(1)
})
