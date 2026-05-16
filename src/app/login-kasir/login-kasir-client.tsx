'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, Lock, ShoppingCart, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CashierItem = { id: string; name: string; role: 'cashier' | 'manager' }
type OutletItem = { id: string; name: string; cashiers: CashierItem[] }
type Bootstrap = {
  workspace: { id: string; name: string } | null
  outlets: OutletItem[]
}

export function LoginKasirClient() {
  const router = useRouter()
  const [data, setData] = useState<Bootstrap | null>(null)
  const [outletId, setOutletId] = useState<string>('')
  const [cashierId, setCashierId] = useState<string>('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/cashier/bootstrap')
      const j: Bootstrap = await res.json()
      setData(j)
      const saved =
        typeof window !== 'undefined' ? localStorage.getItem('pos:last_outlet_id') : null
      const first =
        saved && j.outlets.some((o) => o.id === saved) ? saved : (j.outlets[0]?.id ?? '')
      setOutletId(first as string)
      setLoading(false)
    })()
  }, [])

  const outlet = data?.outlets.find((o) => o.id === outletId)
  const cashiers = outlet?.cashiers ?? []

  useEffect(() => {
    if (outletId) localStorage.setItem('pos:last_outlet_id', outletId)
  }, [outletId])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!cashierId) return toast.error('Pilih kasir')
    if (!/^\d{4,8}$/.test(pin)) return toast.error('PIN minimal 4 digit angka')
    setSubmitting(true)
    const res = await fetch('/api/cashier/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cashierId, pin }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal masuk')
      setPin('')
      return
    }
    toast.success('Berhasil masuk')
    router.push('/kasir')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Image src="/logogramsquare.webp" alt="Mote POS" width={40} height={40} className="rounded-md" />
          <div>
            <div className="text-lg font-bold tracking-tight">Login Kasir</div>
            <div className="text-xs text-muted-foreground">
              {data?.workspace?.name ?? 'Mote POS'}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {loading ? (
            <div className="py-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" /> Memuat…
            </div>
          ) : !data?.workspace ? (
            <div className="text-sm text-destructive text-center py-6">
              Workspace belum di-setup. Mohon kontak owner.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="outlet">Outlet</Label>
                <Select value={outletId} onValueChange={(v) => { setOutletId(v ?? ''); setCashierId('') }}>
                  <SelectTrigger id="outlet">
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.outlets.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pilih Kasir</Label>
                {cashiers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                    Belum ada kasir di outlet ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {cashiers.map((c) => {
                      const active = c.id === cashierId
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setCashierId(c.id)}
                          className={`rounded-xl border p-3 text-left transition-all hover:border-brand-500/40 hover:shadow-sm ${
                            active
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserCircle2 className="size-5 text-muted-foreground" />
                            <span className="font-semibold text-sm truncate">{c.name}</span>
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {c.role}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pin">PIN</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="• • • • • •"
                    className="w-full h-12 rounded-lg border border-input bg-transparent pl-10 pr-3 text-center text-xl tracking-[0.5em] tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !cashierId || pin.length < 4}
                className="w-full h-11 gap-2 font-semibold transition-colors hover:bg-brand-500/90"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                <ShoppingCart className="size-4" /> Masuk
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
