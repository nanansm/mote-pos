import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, PoolConfig } from 'pg'
import * as schema from './schema'

const g = global as typeof global & {
  _pgPool?: Pool
  _pgKeepAlive?: NodeJS.Timeout
}

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL!,
  max: 10,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 30_000,
  allowExitOnIdle: false,
}

if (!g._pgPool) {
  g._pgPool = new Pool(config)
  g._pgPool.on('error', (err) => {
    console.error('[pg pool error]', err.message)
  })

  if (!g._pgKeepAlive) {
    g._pgKeepAlive = setInterval(async () => {
      try {
        await g._pgPool!.query('SELECT 1')
      } catch (err) {
        console.error('[pg keepalive failed]', err)
      }
    }, 3 * 60 * 1000)
  }
}

export const pool = g._pgPool
export const db = drizzle(pool, { schema })
export type DB = typeof db
