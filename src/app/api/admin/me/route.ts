import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const u = await getCurrentUser()
  if (!u) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (u.role !== 'owner') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json({ id: u.id, email: u.email, name: u.name, role: u.role })
}
