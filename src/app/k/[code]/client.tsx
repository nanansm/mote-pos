'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, Lock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Workspace = {
  id: string
  name: string
  businessType: 'resto' | 'retail' | 'jasa'
}
type Outlet = { id: string; name: string; address: string }
type Cashier = { id: string; name: string; role: 'cashier' | 'manager'; outletId: string }

const BUSINESS_LABEL: Record<Workspace['businessType'], string> = {
  resto: 'Restoran',
  retail: 'Retail',
  jasa: 'Jasa',
}

export function CashierLoginClient({
  workspace,
  outlets,
  cashiers,
  loginCode,
}: {
  workspace: Workspace
  outlets: Outlet[]
  cashiers: Cashier[]
  loginCode: string
}) {
  const router = useRouter()
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(
    outlets.length === 1 ? outlets[0].id : null,
  )
  const [selectedCashierId, setSelectedCashierId] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const cashiersInOutlet = useMemo(
    () => (selectedOutletId ? cashiers.filter((c) => c.outletId === selectedOutletId) : []),
    [cashiers, selectedOutletId],
  )

  const canSubmit = !!selectedCashierId && /^\d{4,8}$/.test(pin) && !loading

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault()
    if (!selectedCashierId) return toast.error('Pilih kasir')
    if (!/^\d{4,8}$/.test(pin)) return toast.error('PIN harus 4-8 digit angka')

    setLoading(true)
    try {
      const res = await fetch('/api/cashier/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          login_code: loginCode,
          cashier_id: selectedCashierId,
          pin,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Login gagal')
        setPin('')
        return
      }

      toast.success('Berhasil masuk')
      router.push('/kasir')
      router.refresh()
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Image
            src="/logogramsquare.webp"
            alt="Mote POS"
            width={40}
            height={40}
            priority
            className="rounded-md"
          />
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight">Login Kasir</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <span className="truncate">{workspace.name}</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {BUSINESS_LABEL[workspace.businessType]}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-5">
          {outlets.length === 0 ? (
            <div className="text-sm text-destructive text-center py-6">
              Belum ada outlet aktif. Hubungi owner toko.
            </div>
          ) : (
            <>
              {outlets.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pilih Outlet</label>
                  <div className="grid gap-2">
                    {outlets.map((o) => {
                      const active = selectedOutletId === o.id
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setSelectedOutletId(o.id)
                            setSelectedCashierId(null)
                          }}
                          className={`text-left p-3 rounded-lg border-2 transition-colors min-h-[56px] ${
                            active
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-border hover:border-brand-500/40 hover:bg-muted/60'
                          }`}
                        >
                          <div className="font-medium">{o.name}</div>
                          {o.address && (
                            <div className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                              <MapPin className="size-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{o.address}</span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedOutletId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pilih Kasir</label>
                  {cashiersInOutlet.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Belum ada kasir aktif di outlet ini.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {cashiersInOutlet.map((c) => {
                        const active = selectedCashierId === c.id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCashierId(c.id)}
                            className={`p-3 rounded-lg border-2 text-left transition-colors min-h-[64px] ${
                              active
                                ? 'border-brand-500 bg-brand-500/10'
                                : 'border-border hover:border-brand-500/40 hover:bg-muted/60'
                            }`}
                          >
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {c.role === 'manager' ? 'Manager' : 'Cashier'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedCashierId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Lock className="size-3.5" /> PIN (4-8 digit)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-2xl tracking-[0.5em] p-3 border-2 border-border rounded-lg focus:border-brand-500 focus:outline-none bg-background min-h-[56px]"
                    placeholder="••••"
                    autoFocus
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full min-h-[44px] font-semibold transition-colors hover:bg-brand-500/90"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Memproses…
                  </span>
                ) : (
                  'Masuk'
                )}
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
