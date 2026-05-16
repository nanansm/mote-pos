import { NextResponse } from 'next/server'
import { getCashierSession } from '@/lib/cashier-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getCashierSession()
  if (!ctx) return NextResponse.json({ session: null })
  return NextResponse.json({
    session: {
      cashierId: ctx.cashierId,
      cashierName: ctx.cashierName,
      cashierRole: ctx.cashierRole,
      workspaceId: ctx.workspaceId,
      workspaceName: ctx.workspaceName,
      outletId: ctx.outletId,
      outletName: ctx.outletName,
      shiftId: ctx.shiftId,
    },
  })
}
