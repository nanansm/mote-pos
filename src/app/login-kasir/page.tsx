import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LegacyLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="size-12 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Halaman Ini Tidak Digunakan</h1>
        <p className="text-sm text-muted-foreground">
          Login kasir sekarang menggunakan link unik per toko. Hubungi owner untuk mendapatkan link login kasir terbaru.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted/60 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
