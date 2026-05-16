import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  let dbStatus = 'disconnected'
  let redisStatus = 'disconnected'

  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ])
    dbStatus = 'connected'
  } catch (err) {
    console.error('[health] db error', err)
  }

  try {
    await Promise.race([
      redis.ping(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
    ])
    redisStatus = 'connected'
  } catch (err) {
    console.error('[health] redis error', err)
  }

  return NextResponse.json({
    status: dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'degraded',
    db: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  })
}
