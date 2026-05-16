import {
  Banknote,
  CreditCard,
  HandCoins,
  PiggyBank,
  QrCode,
  Wallet,
} from 'lucide-react'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

export type PaymentBreakdownItem = {
  method: string
  label: string
  amount: number
  count: number
}

export type ShiftSummary = {
  breakdown: PaymentBreakdownItem[]
  totalAll: number
  totalCount: number
  expectedBalance: number
  cashIn: number
}

const ICON_BY_METHOD: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  qris: QrCode,
  transfer: CreditCard,
  debt: HandCoins,
  deposit: PiggyBank,
}

function MethodIcon({ method, className }: { method: string; className?: string }) {
  const Icon = ICON_BY_METHOD[method] ?? Wallet
  return <Icon className={className} />
}

export function ShiftSummaryCard({
  summary,
  title = 'Ringkasan Transaksi',
}: {
  summary: ShiftSummary
  title?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold">{title}</h2>

      <div className="space-y-2">
        {summary.breakdown.map((item) => (
          <div
            key={item.method}
            className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-b-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MethodIcon method={item.method} className="size-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{item.label}</span>
              {item.count > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({item.count} trx)
                </span>
              )}
            </div>
            <span
              className={cn(
                'font-semibold tabular-nums shrink-0',
                item.amount === 0 ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {formatRupiah(item.amount)}
            </span>
          </div>
        ))}

        <div className="border-t-2 border-foreground/80 pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">TOTAL</span>
            <span className="text-base font-bold tabular-nums">
              {formatRupiah(summary.totalAll)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {summary.totalCount} transaksi tercatat di shift ini.
      </p>
    </div>
  )
}
