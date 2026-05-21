import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getAuthContext } from '@/lib/auth-context'
import { AppShell } from '@/components/app-shell'
import { CashierShell } from '@/components/cashier-shell'

export const dynamic = 'force-dynamic'

// Routes that ONLY owner can access. Cashier hitting these is redirected to /kasir.
const OWNER_ONLY_PREFIXES = [
  '/dashboard',
  '/produk',
  '/kategori',
  '/modifier',
  '/kasir-list',
]

// Pengaturan tabs reserved for owner. Cashier accessing /pengaturan without
// `tab=outlet` is forced to that tab (handled inside the page itself), but the
// route is still accessible.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')

  const hdrs = await headers()
  const pathname = hdrs.get('x-pathname') ?? hdrs.get('x-invoke-path') ?? ''

  if (ctx.type === 'cashier') {
    if (OWNER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      redirect('/kasir')
    }
    return (
      <CashierShell
        cashier={{ name: ctx.cashierName, role: ctx.cashierRole }}
        workspace={{
          id: ctx.workspace.id,
          name: ctx.workspace.name,
          businessType: ctx.workspace.businessType,
        }}
        outlet={{ name: ctx.outlet.name }}
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
