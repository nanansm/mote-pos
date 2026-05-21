'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  X,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MobileHeader } from '@/components/layout/mobile-header'

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
  workspace: { id: string; name: string; businessType?: string | null }
  outlet: { name: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hasShift, setHasShift] = useState(false)

  // Close drawer on route change.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setHasShift(!!localStorage.getItem('pos:shift_id'))
  }, [pathname])

  // Lock body scroll when drawer is open on mobile.
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
  const businessLabel = workspace.businessType
    ? BUSINESS_LABEL[workspace.businessType] ?? workspace.businessType
    : null

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop sidebar (≥lg) — persistent */}
      <aside className="hidden lg:flex lg:static fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarContent
          pathname={pathname}
          workspaceName={workspace.name}
          outletName={outlet.name}
          businessLabel={businessLabel}
          cashier={cashier}
          hasShift={hasShift}
          isActive={isActive}
          handleLogout={handleLogout}
          onItemClick={() => {}}
        />
      </aside>

      {/* Mobile/tablet drawer (<lg) */}
      <div
        className={`lg:hidden fixed inset-0 z-40 ${
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <button
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Drawer panel */}
        <aside
          className={`absolute inset-y-0 left-0 w-[min(280px,75vw)] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent
            pathname={pathname}
            workspaceName={workspace.name}
            outletName={outlet.name}
            businessLabel={businessLabel}
            cashier={cashier}
            hasShift={hasShift}
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
          outletName={outlet.name}
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
  pathname,
  workspaceName,
  outletName,
  businessLabel,
  cashier,
  hasShift,
  isActive,
  handleLogout,
  onItemClick,
  showClose,
  onClose,
}: {
  pathname: string
  workspaceName: string
  outletName: string
  businessLabel: string | null
  cashier: { name: string; role: string }
  hasShift: boolean
  isActive: (item: NavItem) => boolean
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
            href="/kasir"
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
        <div className="mt-3 rounded-lg bg-secondary/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Toko
          </div>
          <div className="mt-0.5 text-sm font-semibold truncate">
            {workspaceName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {outletName}
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {businessLabel && (
              <span className="inline-flex items-center rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {businessLabel}
              </span>
            )}
            {hasShift && (
              <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:bg-emerald-950/40 dark:text-emerald-300">
                Shift Aktif
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <Link href="/kasir/buka-shift" onClick={onItemClick}>
          <Button className="w-full justify-start gap-2 h-11 font-semibold shadow-sm shadow-primary/25">
            <PlayCircle className="size-4" />
            Buka Kasir
          </Button>
        </Link>
        <Link href="/kasir/tutup-shift" onClick={onItemClick}>
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
              <details key={item.label} open={active} className="group">
                <summary
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer list-none transition-colors min-h-[44px] ${
                    active
                      ? 'bg-[#FAEEDA] text-[#854F0B]'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                  )}
                  <item.Icon className={`size-[18px] ${active ? 'text-[#854F0B]' : ''}`} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-1 ml-7 space-y-0.5 border-l border-sidebar-border pl-2">
                  {item.submenu.map((sub) => {
                    const subActive =
                      pathname === sub.href || pathname.startsWith(sub.href + '/')
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onItemClick}
                        className={`block px-3 py-2 rounded-md text-[13px] transition-colors min-h-[40px] flex items-center ${
                          subActive
                            ? 'bg-[#FAEEDA]/60 text-[#854F0B] font-medium'
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
              onClick={onItemClick}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors min-h-[44px] ${
                isActive(item)
                  ? 'bg-[#FAEEDA] text-[#854F0B]'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              {isActive(item) && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
              )}
              <item.Icon className={`size-[18px] ${isActive(item) ? 'text-[#854F0B]' : ''}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-1 pb-2">
          <div className="size-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {cashier.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{cashier.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {cashier.role}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="size-4" /> Logout Kasir
        </button>
      </div>
    </div>
  )
}
