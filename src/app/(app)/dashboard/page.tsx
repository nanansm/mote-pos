import Link from 'next/link'
import { eq, and, gte, sql, desc } from 'drizzle-orm'
import {
  ArrowRight,
  Plus,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Package as PackageIcon,
  PlayCircle,
  Printer,
  FileSpreadsheet,
  Layers as LayersIcon,
  Eye,
} from 'lucide-react'
import { db } from '@/lib/db'
import {
  transactions,
  products,
  shiftSessions,
} from '@/lib/db/schema'
import { getCurrentContext } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'

export const dynamic = 'force-dynamic'

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatTanggalIndonesia(d: Date) {
  return `${HARI_ID[d.getDay()]}, ${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`
}

function formatJam(d: Date) {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default async function DashboardPage() {
  const ctx = await getCurrentContext()
  if (!ctx?.workspace) return null

  const today = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(start)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const [todayRow, yesterdayRow, productCountRow, openShiftRow, recentTrxRows] =
    await Promise.all([
      db
        .select({
          total: sql<string>`COALESCE(SUM(${transactions.total}), 0)`,
          count: sql<number>`COUNT(*)::int`,
          items: sql<number>`COALESCE(SUM((SELECT COUNT(*) FROM mote_pos.transaction_items ti WHERE ti.transaction_id = ${transactions.id})), 0)::int`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, ctx.workspace.id),
            eq(transactions.status, 'completed'),
            gte(transactions.trxDate, start),
          ),
        ),
      db
        .select({
          total: sql<string>`COALESCE(SUM(${transactions.total}), 0)`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, ctx.workspace.id),
            eq(transactions.status, 'completed'),
            gte(transactions.trxDate, yesterdayStart),
            sql`${transactions.trxDate} < ${start}`,
          ),
        ),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(products)
        .where(
          and(eq(products.workspaceId, ctx.workspace.id), eq(products.isActive, true)),
        ),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(shiftSessions)
        .where(
          and(
            eq(shiftSessions.workspaceId, ctx.workspace.id),
            eq(shiftSessions.status, 'open'),
          ),
        ),
      db
        .select({
          id: transactions.id,
          trxNumber: transactions.trxNumber,
          total: transactions.total,
          paymentMethod: transactions.paymentMethod,
          trxDate: transactions.trxDate,
          status: transactions.status,
        })
        .from(transactions)
        .where(eq(transactions.workspaceId, ctx.workspace.id))
        .orderBy(desc(transactions.trxDate))
        .limit(5),
    ])

  const salesTotal = Number(todayRow[0]?.total ?? 0)
  const trxCount = todayRow[0]?.count ?? 0
  const itemsCount = todayRow[0]?.items ?? 0
  const avgPerTrx = trxCount > 0 ? salesTotal / trxCount : 0
  const productCount = productCountRow[0]?.count ?? 0
  const openShifts = openShiftRow[0]?.count ?? 0

  const yTotal = Number(yesterdayRow[0]?.total ?? 0)
  const yCount = yesterdayRow[0]?.count ?? 0
  const trendPct =
    yTotal > 0 ? Math.round(((salesTotal - yTotal) / yTotal) * 100) : null
  const trendCountPct =
    yCount > 0 ? Math.round(((trxCount - yCount) / yCount) * 100) : null

  const stats = [
    {
      label: 'Penjualan Hari Ini',
      value: formatRupiah(salesTotal),
      sub:
        trendPct === null
          ? 'vs kemarin —'
          : `${trendPct >= 0 ? '↑' : '↓'} ${Math.abs(trendPct)}% vs kemarin`,
      tone: trendPct === null ? 'neutral' : trendPct >= 0 ? 'up' : 'down',
      Icon: TrendingUp,
    },
    {
      label: 'Transaksi Hari Ini',
      value: String(trxCount),
      sub:
        trendCountPct === null
          ? 'vs kemarin —'
          : `${trendCountPct >= 0 ? '↑' : '↓'} ${Math.abs(trendCountPct)}% vs kemarin`,
      tone: trendCountPct === null ? 'neutral' : trendCountPct >= 0 ? 'up' : 'down',
      Icon: Receipt,
    },
    {
      label: 'Item Terjual',
      value: String(itemsCount),
      sub: `Rata-rata ${formatRupiah(avgPerTrx)}/trx`,
      tone: 'neutral' as const,
      Icon: ShoppingCart,
    },
    {
      label: 'Shift Aktif',
      value: String(openShifts),
      sub: openShifts > 0 ? 'Sedang berlangsung' : 'Belum ada shift terbuka',
      tone: 'neutral' as const,
      Icon: PlayCircle,
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatTanggalIndonesia(today)}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Halo, {ctx.user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ringkasan {ctx.workspace.name} hari ini.
          </p>
        </div>
        <Link href={openShifts > 0 ? '/kasir' : '/kasir/buka-shift'}>
          <Button size="lg" className="gap-2 h-12 px-6 text-base font-semibold shadow-lg shadow-primary/25 w-full sm:w-auto">
            {openShifts > 0 ? 'Lanjut Kasir' : 'Mulai Transaksi'}
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                {s.label}
              </div>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <s.Icon className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {s.value}
            </div>
            <div
              className={`mt-1.5 text-xs font-medium ${
                s.tone === 'up'
                  ? 'text-success'
                  : s.tone === 'down'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {productCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <PackageIcon className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Belum ada produk</div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tambah produk pertama atau import via CSV agar bisa mulai jualan.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/produk" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="gap-2 w-full">
                <Plus className="size-4" /> Tambah Produk
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Aktivitas */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold">Aktivitas Hari Ini</h2>
            <Link
              href="/transaksi"
              className="text-xs font-semibold text-primary hover:underline underline-offset-4 flex items-center gap-1"
            >
              Lihat Semua <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentTrxRows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Receipt className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Belum ada transaksi. Buka shift untuk mulai.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentTrxRows.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Receipt className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{t.trxNumber}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>{formatJam(new Date(t.trxDate))}</span>
                      <span className="size-1 rounded-full bg-border" />
                      <span className="uppercase">{t.paymentMethod}</span>
                      {t.status !== 'completed' && (
                        <>
                          <span className="size-1 rounded-full bg-border" />
                          <span className="text-destructive uppercase">{t.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {formatRupiah(Number(t.total))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold">Quick Action</h2>
          </div>
          <div className="p-3 space-y-1">
            <QuickLink
              href="/produk"
              Icon={PackageIcon}
              title="Tambah Produk"
              desc="Atur menu atau katalog"
            />
            <QuickLink
              href="/produk"
              Icon={FileSpreadsheet}
              title="Import CSV"
              desc="Upload produk via spreadsheet"
            />
            <QuickLink
              href="/kategori"
              Icon={LayersIcon}
              title="Atur Kategori"
              desc="Kelompokkan produk"
            />
            <QuickLink
              href="/pengaturan"
              Icon={Printer}
              title="Setup Printer"
              desc="IP printer thermal WiFi"
            />
            <QuickLink
              href="/laporan/penjualan"
              Icon={Eye}
              title="Lihat Laporan"
              desc="Penjualan & shift"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  Icon,
  title,
  desc,
}: {
  href: string
  Icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
    >
      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}
