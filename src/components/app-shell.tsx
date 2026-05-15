'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  PlayCircle,
  Layers,
  SlidersHorizontal,
  ReceiptText,
  ChevronRight,
  ScrollText,
} from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { useKeepAlive } from '@/hooks/use-keep-alive'
import { Button } from '@/components/ui/button'
import { OnlineIndicator } from '@/components/online-indicator'

type NavItem = {
  href: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home },
  { href: '/kasir', label: 'Kasir', Icon: ShoppingCart },
  { href: '/transaksi', label: 'Transaksi', Icon: ReceiptText },
  { href: '/produk', label: 'Produk', Icon: Package },
  { href: '/kategori', label: 'Kategori', Icon: Layers },
  { href: '/modifier', label: 'Modifier', Icon: SlidersHorizontal },
  { href: '/pelanggan', label: 'Pelanggan', Icon: Users },
  { href: '/hutang', label: 'Hutang', Icon: ScrollText },
  { href: '/kasir-list', label: 'Kasir & Shift', Icon: UserCog },
  { href: '/laporan/penjualan', label: 'Laporan', Icon: BarChart3 },
  { href: '/pengaturan', label: 'Pengaturan', Icon: Settings },
]

const BUSINESS_LABEL: Record<string, string> = {
  resto: 'Restoran',
  retail: 'Retail',
  jasa: 'Jasa',
}

export function AppShell({
  children,
  user,
  workspace,
}: {
  children: React.ReactNode
  user: { name: string; email: string }
  workspace: { id: string; name: string; businessType?: string | null }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useKeepAlive()

  const handleLogout = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-4 py-4 border-b border-sidebar-border">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5"
              onClick={() => setMobileOpen(false)}
            >
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
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{workspace.name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  {workspace.businessType && (
                    <span className="inline-flex items-center rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      {BUSINESS_LABEL[workspace.businessType] ?? workspace.businessType}
                    </span>
                  )}
                  <OnlineIndicator workspaceId={workspace.id} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3">
            <Link href="/kasir/buka-shift" onClick={() => setMobileOpen(false)}>
              <Button className="w-full justify-start gap-2 h-10 font-semibold shadow-sm shadow-primary/25">
                <PlayCircle className="size-4" />
                Buka Kasir
              </Button>
            </Link>
          </div>

          <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const active = isActive(item.href)
              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground cursor-not-allowed"
                  >
                    <item.Icon className="size-4" />
                    {item.label}
                    <span className="ml-auto text-[10px] uppercase rounded bg-muted px-1 py-0.5">
                      soon
                    </span>
                  </div>
                )
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                  )}
                  <item.Icon
                    className={`size-4 ${active ? 'text-primary' : ''}`}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <div className="px-3 pb-3">
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="size-4" />
              Logout
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logogramsquare.webp"
              alt="Mote POS"
              width={26}
              height={26}
              className="rounded-md"
            />
            <span className="text-base font-bold tracking-tight">
              Mote <span className="text-muted-foreground font-semibold">POS</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <OnlineIndicator workspaceId={workspace.id} />
            <Link href="/kasir">
              <Button size="sm" className="gap-1.5 font-semibold">
                Kasir <ChevronRight className="size-4" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
