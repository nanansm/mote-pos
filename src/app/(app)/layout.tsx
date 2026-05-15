import { redirect } from 'next/navigation'
import { getCurrentContext } from '@/lib/session'
import { AppShell } from '@/components/app-shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentContext()
  if (!ctx) redirect('/sign-in')
  if (!ctx.workspace) redirect('/onboarding')

  return (
    <AppShell
      user={{ name: ctx.user.name, email: ctx.user.email }}
      workspace={{
        id: ctx.workspace.id,
        name: ctx.workspace.name,
        businessType: ctx.workspace.businessType,
      }}
    >
      {children}
    </AppShell>
  )
}
