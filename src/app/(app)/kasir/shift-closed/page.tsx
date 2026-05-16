import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Printer } from 'lucide-react'
import { getAuthContext } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function ShiftClosedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')

  const isCashier = ctx.type === 'cashier'
  const backHref = isCashier
    ? `/k/${ctx.workspace.loginCode ?? ''}`
    : '/dashboard'
  const backLabel = isCashier ? 'Logout Kasir' : 'Kembali ke Dashboard'

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-5 shadow-sm">
        <div className="flex justify-center">
          <div className="size-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="size-8" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Telah Ditutup</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Laporan shift sudah disimpan. Kamu bisa cetak ulang Z-Report kapan saja
            dari menu Laporan.
          </p>
        </div>

        <div className="space-y-2">
          {id ? (
            <Link href={`/print/shift-report/${id}`} target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full h-11 gap-2">
                <Printer className="size-4" />
                Print Z-Report
              </Button>
            </Link>
          ) : null}

          <Link href={backHref} className="block">
            <Button variant="outline" className="w-full h-11 gap-2">
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
