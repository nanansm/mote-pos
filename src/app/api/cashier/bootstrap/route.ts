import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      error:
        'Endpoint ini sudah tidak digunakan. Gunakan link login kasir /k/[code].',
    },
    { status: 410 },
  )
}
