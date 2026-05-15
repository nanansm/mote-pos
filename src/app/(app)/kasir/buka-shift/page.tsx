'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, User as UserIcon, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'

type Cashier = { id: string; name: string; role: 'cashier' | 'manager'; isActive: boolean }

export default function BukaShiftPage() {
  const router = useRouter()
  const [list, setList] = useState<Cashier[]>([])
  const [cashierId, setCashierId] = useState<string>('')
  const [pin, setPin] = useState('')
  const [opening, setOpening] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/cashiers')
      .then((r) => r.json())
      .then((j) => {
        const active = ((j.data ?? []) as Cashier[]).filter((c) => c.isActive)
        setList(active)
        if (active.length) setCashierId(active[0].id)
      })
  }, [])

  const submit = async () => {
    if (!cashierId) return toast.error('Pilih kasir')
    if (!/^\d{6}$/.test(pin)) return toast.error('PIN harus 6 digit')
    setLoading(true)
    const res = await fetch('/api/shifts/open', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cashierId, pin, openingBalance: opening }),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal buka shift')
    }
    const j = await res.json()
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos:shift_id', j.id)
      localStorage.setItem('pos:cashier_id', j.cashier.id)
      localStorage.setItem('pos:cashier_name', j.cashier.name)
      localStorage.setItem('pos:cashier_role', j.cashier.role ?? 'cashier')
      localStorage.setItem('pos:shift_opened_at', new Date().toISOString())
    }
    toast.success('Shift dibuka')
    router.push('/kasir')
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PlayCircle className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Buka Shift</h1>
            <p className="text-xs text-muted-foreground">
              Mulai shift kasir sebelum menerima transaksi.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Pilih Kasir</Label>
            {list.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-3">
                Belum ada kasir aktif. Tambah dulu di{' '}
                <a href="/kasir-list" className="text-primary underline">
                  Kasir &amp; Shift
                </a>
                .
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {list.map((c) => {
                  const active = c.id === cashierId
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setCashierId(c.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`size-9 rounded-full flex items-center justify-center ${
                          c.role === 'manager'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {c.role === 'manager' ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <UserIcon className="size-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{c.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {c.role}
                        </div>
                      </div>
                      {active && (
                        <span className="text-xs font-semibold text-primary">Pilih</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN 6-digit</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.5em] h-12"
              placeholder="••••••"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opening">Saldo Awal Kas</Label>
            <CurrencyInput
              id="opening"
              value={opening}
              onValueChange={(n) => setOpening(n)}
            />
            <p className="text-xs text-muted-foreground">
              Uang receh / kembalian di laci saat shift dimulai.
            </p>
          </div>

          <Button
            onClick={submit}
            disabled={loading || !cashierId}
            className="w-full h-11 font-semibold gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? 'Memproses…' : 'Buka Shift'}
          </Button>
        </div>
      </div>
    </div>
  )
}
