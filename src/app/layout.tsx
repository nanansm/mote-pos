import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Mote POS — Kasir Gratis untuk UMKM Indonesia',
    template: '%s | Mote POS',
  },
  description:
    'Aplikasi kasir modern yang mudah dipakai. Cetak struk otomatis, sync ke pembukuan Klir, gratis selamanya untuk UMKM Indonesia.',
  keywords: [
    'kasir umkm',
    'aplikasi kasir',
    'pos gratis',
    'kasir tablet',
    'cetak struk wifi',
    'kasir indonesia',
    'sinkron klir',
  ],
  authors: [{ name: 'Mote Kreatif' }],
  creator: 'Mote Kreatif',
  metadataBase: new URL('https://pos.motekreatif.com'),
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://pos.motekreatif.com',
    siteName: 'Mote POS',
    title: 'Mote POS — Kasir Gratis untuk UMKM Indonesia',
    description:
      'Aplikasi kasir modern, mudah dipakai. Cetak struk otomatis, sync ke pembukuan Klir.',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'Mote POS' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mote POS — Kasir Gratis untuk UMKM',
    description: 'Kasir modern + sync ke pembukuan Klir.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#EAB308',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
