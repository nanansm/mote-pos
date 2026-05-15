import { NextResponse } from 'next/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getSession } from '@/lib/session'

const Body = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
})

export async function PUT(req: Request) {
  const sess = await getSession()
  if (!sess?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'gagal ganti password' },
      { status: 400 },
    )
  }
  return NextResponse.json({ ok: true })
}
