import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { AdminShell } from '@/components/admin-shell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser()
  if (!u) redirect('/admin-login')
  if (u.role !== 'owner') redirect('/admin-login?denied=1')

  return (
    <AdminShell user={{ name: u.name, email: u.email }}>{children}</AdminShell>
  )
}
