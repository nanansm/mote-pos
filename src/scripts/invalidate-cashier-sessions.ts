import 'dotenv/config'
import { db } from '@/lib/db'
import { cashierSessions } from '@/lib/db/schema'

async function main() {
  await db.delete(cashierSessions)
  console.log('[invalidate] all cashier sessions deleted')
}

main()
  .catch((err) => {
    console.error('[invalidate] error:', err)
    process.exitCode = 1
  })
  .finally(() => process.exit())
