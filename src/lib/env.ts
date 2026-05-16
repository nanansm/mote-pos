function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v && process.env.NODE_ENV === 'production') {
    throw new Error(`[env] ${key} is required in production`)
  }
  return v ?? ''
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  REDIS_URL: requireEnv('REDIS_URL'),
  BETTER_AUTH_SECRET: requireEnv('BETTER_AUTH_SECRET'),
  BETTER_AUTH_URL:
    process.env.BETTER_AUTH_URL ??
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3030'),
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3030'),
}
