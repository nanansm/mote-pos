import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TABS = [
  { href: '/laporan/penjualan', label: 'Penjualan' },
  { href: '/laporan/produk', label: 'Produk' },
  { href: '/laporan/shift', label: 'Shift' },
  { href: '/laporan/z-report', label: 'Z-Report' },
]

export default function LaporanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Laporan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pantau performa toko dari berbagai sudut pandang.
        </p>
      </div>
      <nav className="flex gap-1 border-b border-border overflow-x-auto -mb-px">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground border-b-2 border-transparent transition-colors data-[active]:border-primary data-[active]:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
