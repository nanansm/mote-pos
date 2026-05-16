import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-context'
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

const CASHIER_TABS = new Set(['outlet'])

export default async function PengaturanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ctx = await requireAuth()
  const sp = await searchParams
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab

  if (ctx.type === 'cashier') {
    if (!ctx.outlet) redirect('/kasir')
    if (tabRaw && ALLOWED_TABS.has(tabRaw) && !CASHIER_TABS.has(tabRaw)) {
      redirect('/pengaturan?tab=outlet')
    }
    const outlet = ctx.outlet
    return (
      <SettingsClient
        defaultTab="outlet"
        isCashier
        user={{ email: '', role: 'user' }}
        isWorkspaceOwner={false}
        workspace={{
          id: ctx.workspace.id,
          name: ctx.workspace.name,
          address: ctx.workspace.address ?? '',
          phone: ctx.workspace.phone ?? '',
          businessType: ctx.workspace.businessType,
          loginCode: null,
        }}
        outlet={{
          id: outlet.id,
          name: outlet.name,
          address: outlet.address ?? '',
          phone: outlet.phone ?? '',
          printerIp: outlet.printerIp ?? '',
          printerPort: outlet.printerPort,
        }}
      />
    )
  }

  if (!ctx.workspace || !ctx.outlet) redirect('/onboarding')
  const defaultTab = tabRaw && ALLOWED_TABS.has(tabRaw) ? tabRaw : 'profile'
  const isWorkspaceOwner = ctx.workspace.ownerId === ctx.user.id

  return (
    <SettingsClient
      defaultTab={defaultTab}
      isCashier={false}
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
