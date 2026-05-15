import { redirect } from 'next/navigation'
import { getCurrentContext } from '@/lib/session'
import { OnboardingClient } from './onboarding-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const ctx = await getCurrentContext()
  if (!ctx) redirect('/sign-in')
  if (ctx.workspace) redirect('/dashboard')

  return (
    <div className="mx-auto w-full max-w-2xl">
      <OnboardingClient defaultName={ctx.user.name} />
    </div>
  )
}
