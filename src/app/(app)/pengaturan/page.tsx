import { getCurrentContext } from '@/lib/session'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function PengaturanPage() {
  const ctx = await getCurrentContext()
  if (!ctx?.workspace || !ctx.outlet) redirect('/onboarding')

  return (
    <SettingsClient
      user={{ email: ctx.user.email }}
      workspace={{
        id: ctx.workspace.id,
        name: ctx.workspace.name,
        address: ctx.workspace.address ?? '',
        phone: ctx.workspace.phone ?? '',
        businessType: ctx.workspace.businessType,
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
