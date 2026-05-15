import Redis from 'ioredis'

const g = global as typeof global & { _redis?: Redis }

if (!g._redis) {
  g._redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6384', {
    keyPrefix: 'pos:',
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  })
  g._redis.on('error', (err) => {
    console.error('[redis] error', err.message)
  })
}

export const redis = g._redis
