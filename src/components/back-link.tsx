import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function BackLink({
  href,
  label = 'Kembali',
}: {
  href: string
  label?: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 -ml-3 hover:bg-muted transition-colors min-h-[44px]"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  )
}
