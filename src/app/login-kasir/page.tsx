import { redirect } from 'next/navigation'
import { getCashierSession } from '@/lib/cashier-auth'
import { LoginKasirClient } from './login-kasir-client'

export const dynamic = 'force-dynamic'

export default async function LoginKasirPage() {
  const sess = await getCashierSession()
  if (sess) redirect('/kasir')
  return <LoginKasirClient />
}
