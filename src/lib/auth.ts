import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import { user, session, account, verification } from './db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
    usePlural: false,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3030',
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3030',
  ].filter(Boolean) as string[],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3030',
})

export type Session = typeof auth.$Infer.Session
