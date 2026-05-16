import { NextResponse } from 'next/server'
import { deleteCashierSession } from '@/lib/cashier-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  await deleteCashierSession()
  return NextResponse.json({ ok: true })
}
