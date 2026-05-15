import 'dotenv/config'
import { Pool } from 'pg'

async function main() {
  const email = process.env.OWNER_EMAIL
  if (!email) {
    console.error('[seed-owner] OWNER_EMAIL is required')
    process.exit(1)
  }
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const pool = new Pool({ connectionString: url })
  const res = await pool.query(
    `UPDATE mote_pos."user" SET role = 'owner', updated_at = NOW() WHERE email = $1 RETURNING id, email, role`,
    [email],
  )
  if (res.rowCount === 0) {
    console.error(`[seed-owner] user with email ${email} not found`)
    process.exit(1)
  }
  console.log('[seed-owner] promoted:', res.rows[0])
  await pool.end()
}

main().catch((err) => {
  console.error('[seed-owner] fatal', err)
  process.exit(1)
})
