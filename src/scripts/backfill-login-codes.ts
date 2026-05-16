import 'dotenv/config'
import { db } from '@/lib/db'
import { workspaces } from '@/lib/db/schema'
import { eq, isNull, sql } from 'drizzle-orm'
import { generateLoginCode } from '@/lib/workspace/login-code'

async function main() {
  const rows = await db
    .select()
    .from(workspaces)
    .where(isNull(workspaces.loginCode))

  console.log(`[backfill] ${rows.length} workspaces without login_code`)

  for (const ws of rows) {
    let code = ''
    let attempts = 0
    while (true) {
      code = generateLoginCode(ws.name)
      const existing = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.loginCode, code))
        .limit(1)
      if (existing.length === 0) break
      attempts++
      if (attempts > 20) {
        throw new Error(`Failed to generate unique code for ${ws.id}`)
      }
    }

    await db.update(workspaces).set({ loginCode: code }).where(eq(workspaces.id, ws.id))
    console.log(`[backfill] ${ws.name} → ${code}`)
  }

  // Lock NOT NULL once every workspace has a code
  const remaining = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(isNull(workspaces.loginCode))
    .limit(1)

  if (remaining.length === 0) {
    await db.execute(
      sql`ALTER TABLE mote_pos.workspaces ALTER COLUMN login_code SET NOT NULL`,
    )
    console.log('[backfill] done, login_code is now NOT NULL')
  } else {
    console.warn('[backfill] some workspaces still missing login_code, skipping SET NOT NULL')
  }
}

main()
  .catch((err) => {
    console.error('[backfill] error:', err)
    process.exitCode = 1
  })
  .finally(() => process.exit())
