import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Kode Workspace Tidak Ditemukan
        </h1>
        <p className="text-sm text-muted-foreground">
          Link ini tidak valid atau sudah tidak digunakan. Hubungi owner untuk
          mendapatkan link login kasir terbaru.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted/60 transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
