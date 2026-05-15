'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users as UsersIcon,
  Store,
  Receipt,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { signOut } from '@/lib/auth-client'

const NAV = [
  { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', Icon: UsersIcon },
  { href: '/admin/workspaces', label: 'Workspaces', Icon: Store },
  { href: '/admin/transactions', label: 'Transactions', Icon: Receipt },
] as const

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name: string; email: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    router.push('/admin-login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <ShieldCheck className="size-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Mote POS</div>
                <div className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  Owner Panel
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                  )}
                  <item.Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-slate-800 p-3">
            <div className="px-3 pb-3">
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div className="text-xs text-slate-400 truncate">{user.email}</div>
            </div>
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors mb-1"
            >
              <Store className="size-4" />
              Kembali ke POS
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
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
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-800"
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="text-sm font-bold tracking-tight">Owner Panel</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
