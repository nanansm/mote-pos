/**
 * Shared helpers for Playwright e2e tests.
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import Redis from 'ioredis'

// Workers don't inherit env from global-setup — load .env.local on import.
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: false })

/**
 * Clears the cashier-login rate-limit and block keys from Redis so a long
 * test file doesn't trip the 10/min/IP limit. Safe no-op if REDIS_URL isn't
 * configured.
 */
export async function clearLoginRateLimit() {
  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('[helpers] REDIS_URL not set — cannot clear rate-limit')
    return
  }
  const prefix = process.env.REDIS_KEY_PREFIX ?? 'pos:'
  const redis = new Redis(url, {
    keyPrefix: prefix,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  try {
    await redis.connect()
    const keys = await redis.keys('cashier-login:*')
    if (keys.length) {
      const stripped = keys.map((k) =>
        k.startsWith(prefix) ? k.slice(prefix.length) : k,
      )
      await redis.del(...stripped)
    }
  } catch (err) {
    console.warn('[helpers] clearLoginRateLimit failed:', err)
  } finally {
    await redis.quit().catch(() => null)
  }
}
