import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col min-h-screen">
        <header className="px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/logogramsquare.webp"
              alt="Mote POS"
              width={32}
              height={32}
              priority
              className="rounded-md"
            />
            <span className="text-lg font-bold tracking-tight">
              Mote <span className="text-muted-foreground font-semibold">POS</span>
            </span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full">{children}</div>
        </main>
        <footer className="px-6 py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Mote Kreatif
        </footer>
      </div>

      {/* Brand side (desktop only) */}
      <aside className="hidden lg:flex relative bg-foreground text-background items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(234,179,8,0.18),transparent_70%)]" />
        <div className="relative max-w-md px-8 py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-semibold mb-6">
            Mote POS
          </span>
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
            Kasir modern untuk{' '}
            <span className="bg-gradient-to-br from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              UMKM Indonesia
            </span>
          </h2>
          <p className="mt-4 text-base text-background/70 leading-relaxed">
            Tap produk, cetak struk WiFi, sync otomatis ke pembukuan Klir. Gratis selamanya.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-background/80">
            {[
              'Unlimited transaksi & produk',
              'Multi-kasir dengan PIN approval',
              'Mode offline + auto-sync',
              'Cetak struk thermal WiFi',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="inline-flex size-5 rounded-full bg-primary/20 items-center justify-center">
                  <span className="size-1.5 rounded-full bg-primary" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
