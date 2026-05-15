import 'dotenv/config'
import { Pool } from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const pool = new Pool({ connectionString: url })

  await pool.query('CREATE SCHEMA IF NOT EXISTS mote_pos')

  const drizzleDir = join(process.cwd(), 'drizzle')
  let files: string[] = []
  try {
    files = (await readdir(drizzleDir))
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    console.warn('[migrate] no drizzle/ folder; nothing to apply')
    await pool.end()
    return
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mote_pos._migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  for (const file of files) {
    const id = file
    const existing = await pool.query('SELECT id FROM mote_pos._migrations WHERE id = $1', [id])
    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`[migrate] skip ${id} (already applied)`)
      continue
    }
    const raw = await readFile(join(drizzleDir, file), 'utf8')
    const sql = raw
      .replace(/CREATE SCHEMA\s+(?!IF NOT EXISTS)/gi, 'CREATE SCHEMA IF NOT EXISTS ')
      .replace(/CREATE TYPE\s+(?!IF NOT EXISTS)/gi, 'CREATE TYPE ')
    console.log(`[migrate] applying ${id}`)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // drizzle outputs --> statement-breakpoint as separator
      const stmts = sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)
      for (const stmt of stmts) {
        await client.query(stmt)
      }
      await client.query('INSERT INTO mote_pos._migrations (id) VALUES ($1)', [id])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  await pool.end()
  console.log('[migrate] done')
}

main().catch((err) => {
  console.error('[migrate] fatal', err)
  process.exit(1)
})
