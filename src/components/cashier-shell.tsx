'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ShoppingCart,
  ReceiptText,
  Users,
  ScrollText,
  Wallet,
  Package2,
  BarChart3,
  Settings,
  PlayCircle,
  LogOut,
  Lock,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type SubItem = { href: string; label: string }
type NavItem = {
  href: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  match?: string[]
  submenu?: SubItem[]
}

const NAV: NavItem[] = [
  { href: '/kasir', label: 'Kasir', Icon: ShoppingCart },
  { href: '/transaksi', label: 'Transaksi', Icon: ReceiptText },
  { href: '/pelanggan', label: 'Pelanggan', Icon: Users },
  { href: '/hutang', label: 'Hutang', Icon: ScrollText },
  { href: '/titipan-uang', label: 'Titipan Uang', Icon: Wallet },
  { href: '/titipan-barang', label: 'Titipan Barang', Icon: Package2 },
  {
    href: '/laporan/penjualan',
    label: 'Laporan',
    Icon: BarChart3,
    match: ['/laporan'],
    submenu: [
      { href: '/laporan/penjualan', label: 'Penjualan' },
      { href: '/laporan/produk', label: 'Produk' },
      { href: '/laporan/shift', label: 'Shift' },
      { href: '/laporan/z-report', label: 'Z-Report' },
    ],
  },
  { href: '/pengaturan?tab=outlet', label: 'Pengaturan', Icon: Settings, match: ['/pengaturan'] },
]

const BUSINESS_LABEL: Record<string, string> = {
  resto: 'Restoran',
  retail: 'Retail',
  jasa: 'Jasa',
}

export function CashierShell({
  children,
  cashier,
  workspace,
  outlet,
}: {
  children: React.ReactNode
  cashier: { name: string; role: string }
  workspace: { name: string; businessType?: string | null }
  outlet: { name: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const res = await fetch('/api/cashier/logout', { method: 'POST' })
    if (!res.ok) {
      toast.error('Gagal logout')
      return
    }
    router.push('/')
    router.refresh()
  }

  const isActive = (item: NavItem) => {
    const targets = item.match ?? [item.href.split('?')[0]]
    return targets.some(
      (t) => pathname === t || pathname.startsWith(t + '/'),
    )
  }

  const isFullBleed = pathname === '/kasir'

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-4 py-4 border-b border-sidebar-border">
            <Link href="/kasir" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
              <Image
                src="/logogramsquare.webp"
                alt="Mote POS"
                width={32}
                height={32}
                priority
                className="rounded-md"
              />
              <span className="text-base font-bold tracking-tight">
                Mote <span className="text-muted-foreground font-semibold">POS</span>
              </span>
            </Link>
            <div className="mt-3">
              <div className="text-sm font-semibold truncate">{workspace.name}</div>
              <div className="text-xs text-muted-foreground truncate">{outlet.name}</div>
              {workspace.businessType && (
                <span className="mt-1.5 inline-flex items-center rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {BUSINESS_LABEL[workspace.businessType] ?? workspace.businessType}
                </span>
              )}
            </div>
          </div>

          <div className="p-3 space-y-2">
            <Link href="/kasir/buka-shift" onClick={() => setMobileOpen(false)}>
              <Button className="w-full justify-start gap-2 h-10 font-semibold shadow-sm shadow-primary/25">
                <PlayCircle className="size-4" />
                Buka Kasir
              </Button>
            </Link>
            <Link href="/kasir/tutup-shift" onClick={() => setMobileOpen(false)}>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10 font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Lock className="size-4" />
                Tutup Shift
              </Button>
            </Link>
          </div>

          <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const active = isActive(item)
              if (item.submenu) {
                return (
                  <details
                    key={item.label}
                    open={active}
                    className="group"
                  >
                    <summary
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer list-none transition-colors ${
                        active
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                      )}
                      <item.Icon className={`size-4 ${active ? 'text-primary' : ''}`} />
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-1 ml-7 space-y-0.5 border-l border-sidebar-border pl-2">
                      {item.submenu.map((sub) => {
                        const subActive = pathname === sub.href || pathname.startsWith(sub.href + '/')
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileOpen(false)}
                            className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                              subActive
                                ? 'bg-primary/10 text-foreground font-medium'
                                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  </details>
                )
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                  )}
                  <item.Icon className={`size-4 ${active ? 'text-primary' : ''}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <div className="px-3 pb-3">
              <div className="text-sm font-semibold truncate">{cashier.name}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {cashier.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="size-4" /> Logout Kasir
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-muted"
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="font-bold tracking-tight">Mote POS</span>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              Keluar
            </Button>
          </div>
        </header>
        <main
          className={
            isFullBleed
              ? 'flex-1 min-h-0 min-w-0 overflow-hidden'
              : 'flex-1 min-h-0 min-w-0 p-4 sm:p-6 lg:p-8'
          }
        >
          {children}
        </main>
      </div>
    </div>
  )
}
