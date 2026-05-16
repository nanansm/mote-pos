import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getCurrentContext } from '@/lib/session'
import { getCashierSession } from '@/lib/cashier-auth'
import { AppShell } from '@/components/app-shell'
import { CashierShell } from '@/components/cashier-shell'

export const dynamic = 'force-dynamic'

const OWNER_PREFIXES = [
  '/dashboard',
  '/produk',
  '/kategori',
  '/modifier',
  '/pelanggan',
  '/pengaturan',
  '/laporan',
  '/transaksi',
  '/hutang',
  '/kasir-list',
  '/titipan-uang',
  '/titipan-barang',
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentContext()
  const hdrs = await headers()
  const pathname = hdrs.get('x-pathname') ?? hdrs.get('x-invoke-path') ?? ''

  if (!ctx) {
    const cashier = await getCashierSession()
    if (!cashier) redirect('/sign-in')
    // Cashier-only paths: only /kasir/*; redirect away from owner pages.
    if (OWNER_PREFIXES.some((p) => pathname.startsWith(p))) {
      redirect('/kasir')
    }
    return (
      <CashierShell
        cashier={{ name: cashier.cashierName, role: cashier.cashierRole }}
        workspace={{ name: cashier.workspaceName }}
        outlet={{ name: cashier.outletName }}
      >
        {children}
      </CashierShell>
    )
  }

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
