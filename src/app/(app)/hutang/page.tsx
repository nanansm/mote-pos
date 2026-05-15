import { Suspense } from 'react'
import { HutangClient } from './hutang-client'

export const dynamic = 'force-dynamic'

export default function HutangPage() {
  return (
    <Suspense fallback={null}>
      <HutangClient />
    </Suspense>
  )
}
