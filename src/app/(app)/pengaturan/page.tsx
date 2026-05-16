import { getCurrentContext } from '@/lib/session'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

const ALLOWED_TABS = new Set([
  'profile',
  'outlet',
  'account',
  'struk',
  'integrasi',
  'audit',
  'payment',
])

export default async function PengaturanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ctx = await getCurrentContext()
  if (!ctx?.workspace || !ctx.outlet) redirect('/onboarding')
  const sp = await searchParams
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab
  const defaultTab = tabRaw && ALLOWED_TABS.has(tabRaw) ? tabRaw : 'profile'

  const isWorkspaceOwner = ctx.workspace.ownerId === ctx.user.id

  return (
    <SettingsClient
      defaultTab={defaultTab}
      user={{ email: ctx.user.email, role: ctx.user.role }}
      isWorkspaceOwner={isWorkspaceOwner}
      workspace={{
        id: ctx.workspace.id,
        name: ctx.workspace.name,
        address: ctx.workspace.address ?? '',
        phone: ctx.workspace.phone ?? '',
        businessType: ctx.workspace.businessType,
        loginCode: ctx.workspace.loginCode ?? null,
      }}
      outlet={{
        id: ctx.outlet.id,
        name: ctx.outlet.name,
        address: ctx.outlet.address ?? '',
        phone: ctx.outlet.phone ?? '',
        printerIp: ctx.outlet.printerIp ?? '',
        printerPort: ctx.outlet.printerPort,
      }}
    />
  )
}
