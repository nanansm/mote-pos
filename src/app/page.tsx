import Link from 'next/link'
import {
  ArrowRight,
  Receipt,
  Wifi,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNavbar } from '@/components/public/public-navbar'
import { PublicFooter } from '@/components/public/public-footer'

export default function HomePage() {
  return (
    <>
      <PublicNavbar />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(234,179,8,0.10),transparent_70%)]" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20 lg:pt-20 lg:pb-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Gratis selamanya untuk fitur kasir
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-4xl mx-auto">
              Kasir Gratis untuk{' '}
              <span className="bg-gradient-to-br from-yellow-500 to-amber-600 bg-clip-text text-transparent">
                UMKM Indonesia
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Aplikasi kasir modern yang mudah dipakai. Cetak struk otomatis, sync ke pembukuan Klir, gratis selamanya.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto gap-2 h-12 px-6 text-base font-semibold shadow-lg shadow-primary/25">
                  Mulai Gratis Sekarang
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/#cara-kerja">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-6 text-base">
                  Lihat Cara Kerja
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Dipakai oleh UMKM di Garut, Sumedang, Bandung dan kota lainnya
            </p>

            {/* Mockup visual */}
            <div className="mt-14 max-w-4xl mx-auto">
              <PosMockup />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-y border-border bg-muted/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <p className="text-center text-sm text-muted-foreground">
              Terhubung dengan ekosistem{' '}
              <a
                href="https://klir.motekreatif.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground hover:underline underline-offset-4"
              >
                Klir Akuntansi
              </a>{' '}
              &{' '}
              <span className="font-semibold text-foreground">Mote Blaster WhatsApp</span>
            </p>
          </div>
        </section>

        {/* Problem */}
        <section className="py-20 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pernah Ngerasa?</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-tight">
                Jualan rame tapi catatan berantakan
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <ProblemCard
                title="Hitung manual ribet"
                desc="Pakai kalkulator HP, tambah modifier, tambah ongkir — sering salah hitung."
              />
              <ProblemCard
                title="Catatan kasir berantakan"
                desc="Buku tulis, sticky notes, spreadsheet — semua tersebar di mana-mana."
              />
              <ProblemCard
                title="Pembukuan rumit"
                desc="Akhir bulan harus input ulang ke akuntansi, makan waktu berjam-jam."
              />
            </div>
          </div>
        </section>

        {/* Solusi */}
        <section id="fitur" className="py-20 lg:py-24 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Solusinya</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-tight">
                Kasir yang benar-benar dipakai sehari-hari
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Tap, hitung, cetak. Selesai. Tanpa belajar akuntansi, tanpa training panjang.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <FeatureCard
                Icon={Receipt}
                title="Kasir Cepat & Mudah"
                desc="Tap produk, tambah modifier, hitung otomatis, checkout dalam hitungan detik. Dirancang khusus untuk tablet."
              />
              <FeatureCard
                Icon={Wifi}
                title="Cetak Struk Otomatis"
                desc="Terhubung langsung dengan printer thermal WiFi. Struk tercetak begitu transaksi selesai."
              />
              <FeatureCard
                Icon={RefreshCw}
                title="Sync ke Pembukuan Klir"
                desc="Penjualan otomatis masuk Klir Akuntansi. Owner langsung lihat laporan keuangan tanpa input ulang."
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="cara-kerja" className="py-20 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Cara Kerja</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-tight">
                Tiga langkah, langsung jualan
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <StepCard
                step="01"
                title="Daftar Gratis"
                desc="Isi info toko, pilih jenis usaha, selesai dalam 2 menit. Tidak perlu kartu kredit."
              />
              <StepCard
                step="02"
                title="Tambah Produk"
                desc="Input manual atau import via CSV. Atur kategori, modifier, dan harga sekali saja."
              />
              <StepCard
                step="03"
                title="Mulai Jualan"
                desc="Buka shift di tablet, tap produk, cetak struk. Data tersinkron otomatis ke owner."
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="harga" className="py-20 lg:py-24 bg-muted/30 border-y border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Harga</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Gratis selamanya</h2>
              <p className="mt-4 text-base text-muted-foreground">
                Phase awal — semua fitur kasir gratis, tanpa batas transaksi, tanpa hidden fee.
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-xl shadow-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                  <Zap className="w-3 h-3" />
                  Most Popular
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">Rp 0</span>
                <span className="text-muted-foreground">/bulan</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Selamanya gratis untuk fitur kasir. Mau pembukuan akuntansi otomatis?{' '}
                <a
                  href="https://klir.motekreatif.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Upgrade Klir Pro →
                </a>
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  'Unlimited transaksi',
                  'Unlimited produk & kategori',
                  '1 outlet, multi-kasir + PIN approval',
                  'Modifier produk & varian',
                  'Cetak struk thermal WiFi (ESC/POS)',
                  'Mode offline + auto-sync',
                  'Laporan penjualan & shift',
                  'Sync otomatis ke Klir (opsional)',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="mt-10 block">
                <Button size="lg" className="w-full h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/25">
                  Mulai Gratis Sekarang
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tanpa kartu kredit • Setup &lt; 5 menit
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">FAQ</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Pertanyaan yang sering muncul
              </h2>
            </div>
            <div className="space-y-3">
              <FaqItem
                q="Apakah benar gratis selamanya?"
                a="Ya. Fitur kasir (transaksi, produk, struk, laporan dasar, mode offline) gratis selamanya tanpa batas. Kalau butuh pembukuan akuntansi otomatis SAK EMKM, baru upgrade ke Klir Pro."
              />
              <FaqItem
                q="Hardware apa saja yang didukung?"
                a="Mote POS jalan di tablet Android atau iPad (browser modern). Untuk cetak struk, kami support printer thermal WiFi (ESC/POS) seperti Epson TM-m30, Xprinter, RPP02N, dan kompatibel."
              />
              <FaqItem
                q="Bisa dipakai saat internet mati?"
                a="Bisa. Mode offline otomatis aktif saat koneksi terputus. Transaksi disimpan lokal di browser, lalu sync otomatis ke server saat internet kembali."
              />
              <FaqItem
                q="Bagaimana sync ke pembukuan Klir bekerja?"
                a="Sync ke Klir bersifat opsional. Setelah dihubungkan, tiap akhir hari kami kirim ringkasan penjualan (per metode bayar, per kategori) ke Klir, dan Klir generate jurnal akuntansi otomatis."
              />
              <FaqItem
                q="Bisa multi-kasir / banyak karyawan?"
                a="Bisa. Owner bisa buat banyak akun kasir dengan PIN masing-masing. Untuk void/refund, butuh PIN manager sebagai approval."
              />
              <FaqItem
                q="Bagaimana keamanan data transaksi saya?"
                a="Data Anda terenkripsi dan tersimpan di server Indonesia. Owner panel cuma melihat ringkasan agregat (privacy by design), bukan detail transaksi per customer."
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-24 bg-foreground text-background">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Siap mulai jualan lebih rapi?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-background/70 max-w-xl mx-auto">
              Daftar dalam 2 menit, gratis selamanya. Setup produk pertama dan langsung kasir di hari yang sama.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 h-12 px-8 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
                >
                  Daftar Sekarang
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-8 text-base bg-transparent border-background/30 text-background hover:bg-background/10 hover:text-background"
                >
                  Sudah Punya Akun? Masuk
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  )
}

function ProblemCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="size-2 mt-2.5 rounded-full bg-destructive shrink-0" />
        <div>
          <h3 className="font-bold text-base text-foreground">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  Icon,
  title,
  desc,
}: {
  Icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
      <div className="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
        <Icon className="size-5" />
      </div>
      <h3 className="font-bold text-base text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6">
      <span className="absolute -top-3 left-6 inline-flex items-center justify-center rounded-md bg-foreground text-background px-2.5 py-1 text-xs font-bold tracking-wider">
        {step}
      </span>
      <h3 className="mt-3 font-bold text-lg text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-border bg-card overflow-hidden">
      <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none font-semibold text-sm sm:text-base">
        <span>{q}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
    </details>
  )
}

function PosMockup() {
  return (
    <div className="relative mx-auto rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-yellow-400" />
          <span className="size-2.5 rounded-full bg-green-400" />
        </div>
        <div className="ml-auto text-xs text-muted-foreground font-mono">pos.motekreatif.com/kasir</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] min-h-[280px] sm:min-h-[360px]">
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-background">
          {[
            { name: 'Kopi Susu', price: '18.000', cat: 'Minuman' },
            { name: 'Teh Tarik', price: '15.000', cat: 'Minuman' },
            { name: 'Nasi Goreng', price: '22.000', cat: 'Makanan' },
            { name: 'Roti Bakar', price: '12.000', cat: 'Snack' },
            { name: 'Es Jeruk', price: '10.000', cat: 'Minuman' },
            { name: 'Pisang Goreng', price: '8.000', cat: 'Snack' },
          ].map((p) => (
            <div key={p.name} className="rounded-lg border border-border bg-card p-3 text-left">
              <div className="text-xs text-muted-foreground">{p.cat}</div>
              <div className="mt-1 text-sm font-semibold text-foreground line-clamp-1">{p.name}</div>
              <div className="mt-2 text-sm font-bold text-primary">Rp {p.price}</div>
            </div>
          ))}
        </div>
        <div className="p-5 bg-muted/30 border-l border-border flex flex-col gap-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pesanan</div>
          <div className="flex-1 space-y-2.5">
            <CartRow name="Kopi Susu" qty={2} price="36.000" />
            <CartRow name="Nasi Goreng" qty={1} price="22.000" />
            <CartRow name="Es Jeruk" qty={1} price="10.000" />
          </div>
          <div className="pt-3 border-t border-border space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">Rp 68.000</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-bold">Total</span>
              <span className="font-extrabold text-primary">Rp 68.000</span>
            </div>
          </div>
          <button
            type="button"
            className="mt-1 w-full rounded-lg bg-primary text-primary-foreground font-bold text-sm py-2.5"
          >
            Bayar →
          </button>
        </div>
      </div>
    </div>
  )
}

function CartRow({ name, qty, price }: { name: string; qty: number; price: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-foreground text-background text-[10px] font-bold">
          {qty}
        </span>
        <span className="font-medium">{name}</span>
      </div>
      <span className="text-muted-foreground">Rp {price}</span>
    </div>
  )
}

