import { redirect } from 'next/navigation'
import { getCurrentUser } from './session'

export async function requireOwner() {
  const u = await getCurrentUser()
  if (!u) redirect('/admin-login')
  if (u.role !== 'owner') redirect('/admin-login?denied=1')
  return u
}
