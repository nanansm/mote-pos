'use client'

import { useEffect, useState } from 'react'
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
  X,
  PlayCircle,
  Layers,
  SlidersHorizontal,
  ReceiptText,
  ScrollText,
  Wallet,
  Package2,
} from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { useKeepAlive } from '@/hooks/use-keep-alive'
import { Button } from '@/components/ui/button'
import { OnlineIndicator } from '@/components/online-indicator'
import { MobileHeader } from '@/components/layout/mobile-header'
import { PrinterSetupNavItem } from '@/components/printer-setup-nav-item'

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
  { href: '/titipan-uang', label: 'Titipan Uang', Icon: Wallet },
  { href: '/titipan-barang', label: 'Titipan Barang', Icon: Package2 },
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
  const [drawerOpen, setDrawerOpen] = useState(false)

  useKeepAlive()

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const handleLogout = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const isFullBleed = pathname === '/kasir'
  const businessLabel = workspace.businessType
    ? BUSINESS_LABEL[workspace.businessType] ?? workspace.businessType
    : null

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop sidebar (≥lg) */}
      <aside className="hidden lg:flex lg:static fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarContent
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          businessLabel={businessLabel}
          user={user}
          isActive={isActive}
          handleLogout={handleLogout}
          onItemClick={() => {}}
        />
      </aside>

      {/* Mobile/tablet drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-40 ${
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!drawerOpen}
      >
        <button
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[min(280px,75vw)] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            businessLabel={businessLabel}
            user={user}
            isActive={isActive}
            handleLogout={handleLogout}
            onItemClick={() => setDrawerOpen(false)}
            showClose
            onClose={() => setDrawerOpen(false)}
          />
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onOpenMenu={() => setDrawerOpen(true)}
        />
        <main
          className={
            isFullBleed
              ? 'flex-1 min-h-0 min-w-0 overflow-hidden'
              : 'flex-1 min-h-0 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8'
          }
        >
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  workspaceId,
  workspaceName,
  businessLabel,
  user,
  isActive,
  handleLogout,
  onItemClick,
  showClose,
  onClose,
}: {
  workspaceId: string
  workspaceName: string
  businessLabel: string | null
  user: { name: string; email: string }
  isActive: (href: string) => boolean
  handleLogout: () => void
  onItemClick: () => void
  showClose?: boolean
  onClose?: () => void
}) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={onItemClick}
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
          {showClose && (
            <button
              type="button"
              aria-label="Close menu"
              onClick={onClose}
              className="inline-flex items-center justify-center size-9 -mr-1 rounded-md hover:bg-muted/70 active:bg-muted lg:hidden"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="mt-3">
          <div className="text-sm font-semibold truncate">{workspaceName}</div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {businessLabel && (
              <span className="inline-flex items-center rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {businessLabel}
              </span>
            )}
            <OnlineIndicator workspaceId={workspaceId} />
          </div>
        </div>
      </div>

      <div className="p-3">
        <Link href="/kasir/buka-shift" onClick={onItemClick}>
          <Button className="w-full justify-start gap-2 h-11 font-semibold shadow-sm shadow-primary/25">
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-muted-foreground cursor-not-allowed min-h-[44px]"
              >
                <item.Icon className="size-[18px]" />
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
              onClick={onItemClick}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors min-h-[44px] ${
                active
                  ? 'bg-[#FAEEDA] text-[#854F0B]'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
              )}
              <item.Icon
                className={`size-[18px] transition-colors ${active ? 'text-[#854F0B]' : ''}`}
              />
              {item.label}
            </Link>
          )
        })}
        <PrinterSetupNavItem onItemClick={onItemClick} />
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-1 pb-2">
          <div className="size-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </div>
  )
}
