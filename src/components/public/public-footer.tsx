import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, MapPin, Download } from 'lucide-react'

export function PublicFooter() {
  const apkUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL
  return (
    <footer style={{ background: '#1C1917' }} className="text-white">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Image
                src="/logogramsquare.webp"
                alt="Mote POS"
                width={32}
                height={32}
                className="rounded-md"
              />
              <span className="text-lg font-bold text-white">
                Mote <span className="text-white/60 font-semibold">POS</span>
              </span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed">
              Kasir modern untuk UMKM Indonesia. Gratis selamanya, sync otomatis ke pembukuan Klir.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Produk</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><Link href="/#fitur" className="hover:text-white transition-colors">Fitur</Link></li>
              <li><Link href="/#cara-kerja" className="hover:text-white transition-colors">Cara Kerja</Link></li>
              <li><Link href="/#harga" className="hover:text-white transition-colors">Harga</Link></li>
              <li><Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Ekosistem</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li>
                <a href="https://klir.motekreatif.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  Klir Akuntansi
                </a>
              </li>
              <li>
                <a href="https://motekreatif.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  Mote Kreatif
                </a>
              </li>
              <li><Link href="/sign-up" className="hover:text-white transition-colors">Daftar Gratis</Link></li>
              <li><Link href="/sign-in" className="hover:text-white transition-colors">Masuk</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Kontak</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <a
                  href="https://wa.me/6287790968166"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  +62 877-9096-8166
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <a href="mailto:motekreatif@gmail.com" className="hover:text-white transition-colors">
                  motekreatif@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Jl. Raya Cipanas No.13, Garut,<br />
                  Jawa Barat 44151
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Mote POS by Mote Kreatif. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/40">
            {apkUrl && (
              <a
                href={apkUrl}
                download
                className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh APK
              </a>
            )}
            <a href="https://klir.motekreatif.com/terms" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Syarat & Ketentuan
            </a>
            <a href="https://klir.motekreatif.com/refund-policy" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
