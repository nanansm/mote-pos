'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function PublicNavbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
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

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/#fitur" className="hover:text-foreground transition-colors">Fitur</Link>
          <Link href="/#cara-kerja" className="hover:text-foreground transition-colors">Cara Kerja</Link>
          <Link href="/#harga" className="hover:text-foreground transition-colors">Harga</Link>
          <Link href="/#faq" className="hover:text-foreground transition-colors">FAQ</Link>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/sign-up"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm shadow-primary/25 transition-all"
          >
            Mulai Gratis
          </Link>
        </div>

        <button
          className="sm:hidden p-2 -mr-2 rounded-md hover:bg-secondary"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="sm:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          <Link href="/#fitur" onClick={() => setOpen(false)} className="block text-sm font-medium py-1">Fitur</Link>
          <Link href="/#cara-kerja" onClick={() => setOpen(false)} className="block text-sm font-medium py-1">Cara Kerja</Link>
          <Link href="/#harga" onClick={() => setOpen(false)} className="block text-sm font-medium py-1">Harga</Link>
          <Link href="/#faq" onClick={() => setOpen(false)} className="block text-sm font-medium py-1">FAQ</Link>
          <hr className="border-border" />
          <Link href="/sign-in" onClick={() => setOpen(false)} className="block text-sm font-medium py-1">Masuk</Link>
          <Link
            href="/sign-up"
            onClick={() => setOpen(false)}
            className="block bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-semibold text-sm text-center"
          >
            Mulai Gratis
          </Link>
        </div>
      )}
    </nav>
  )
}
