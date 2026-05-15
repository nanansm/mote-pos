import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db, pool } from '@/lib/db'
import { user as userTable, account as accountTable } from '@/lib/db/schema'
import { newId } from '@/lib/ids'

const PASSWORD = 'Mote123!'

type ResetTarget = {
  email: string
  name: string
  role: 'user' | 'owner'
}

const TARGETS: ResetTarget[] = [
  { email: 'smnanan@gmail.com', name: 'Nanan', role: 'user' },
  { email: 'smnanan@motekreatif.com', name: 'Nanan (Owner)', role: 'owner' },
]

async function upsertCredentialPassword(userId: string, plain: string) {
  const hashed = await hashPassword(plain)
  const existing = await db
    .select({ id: accountTable.id })
    .from(accountTable)
    .where(
      and(
        eq(accountTable.userId, userId),
        eq(accountTable.providerId, 'credential'),
      ),
    )
    .limit(1)

  if (existing[0]) {
    await db
      .update(accountTable)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(accountTable.id, existing[0].id))
    return 'updated' as const
  }

  await db.insert(accountTable).values({
    id: newId(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: hashed,
  })
  return 'inserted' as const
}

async function resetOne(target: ResetTarget) {
  const existing = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, target.email))
    .limit(1)

  if (existing[0]) {
    const u = existing[0]
    const action = await upsertCredentialPassword(u.id, PASSWORD)
    await db
      .update(userTable)
      .set({ role: target.role, updatedAt: new Date() })
      .where(eq(userTable.id, u.id))
    return {
      email: u.email,
      role: target.role,
      action: action === 'inserted' ? 'password-set' : 'password-reset',
      userId: u.id,
    }
  }

  const userId = newId()
  await db.insert(userTable).values({
    id: userId,
    name: target.name,
    email: target.email,
    emailVerified: false,
    role: target.role,
  })
  await upsertCredentialPassword(userId, PASSWORD)
  return { email: target.email, role: target.role, action: 'created', userId }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is required (password hashing must match runtime config)',
    )
  }

  const results: Array<{ email: string; role: string; action: string; userId: string }> = []
  for (const t of TARGETS) {
    results.push(await resetOne(t))
  }

  console.log('\n[reset-users] done — password:', PASSWORD)
  console.table(results)
  await pool.end()
}

main().catch((err) => {
  console.error('[reset-users] fatal', err)
  process.exit(1)
})
