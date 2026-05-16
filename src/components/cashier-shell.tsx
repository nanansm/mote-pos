'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ShoppingCart,
  ReceiptText,
  PowerOff,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type NavItem = {
  href: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { href: '/kasir', label: 'Kasir', Icon: ShoppingCart },
  { href: '/kasir/transaksi-shift', label: 'Transaksi Shift', Icon: ReceiptText },
  { href: '/kasir/tutup-shift', label: 'Tutup Shift', Icon: PowerOff },
]

export function CashierShell({
  children,
  cashier,
  workspace,
  outlet,
}: {
  children: React.ReactNode
  cashier: { name: string; role: string }
  workspace: { name: string }
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform lg:static lg:translate-x-0 ${
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
            <div className="mt-3 text-sm font-semibold truncate">{workspace.name}</div>
            <div className="text-xs text-muted-foreground truncate">{outlet.name}</div>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
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
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  )
}
