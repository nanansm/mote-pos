'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, Loader2, Store, Building2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type BusinessType = 'resto' | 'retail' | 'jasa'

const STEPS = [
  { n: 1, label: 'Toko', Icon: Store },
  { n: 2, label: 'Outlet', Icon: Building2 },
  { n: 3, label: 'Kasir', Icon: ShieldCheck },
] as const

export function OnboardingClient({ defaultName }: { defaultName: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [workspace, setWorkspace] = useState({
    name: '',
    businessType: 'resto' as BusinessType,
    address: '',
    phone: '',
  })
  const [outlet, setOutlet] = useState({
    name: 'Outlet Utama',
    address: '',
    printerIp: '',
  })
  const [cashier, setCashier] = useState({
    name: defaultName ?? '',
    pin: '',
    confirmPin: '',
  })

  const nextStep = () => {
    if (step === 1) {
      if (!workspace.name.trim()) {
        toast.error('Nama toko wajib diisi')
        return
      }
      if (!outlet.address && workspace.address) {
        setOutlet((o) => ({ ...o, address: workspace.address }))
      }
      setStep(2)
      return
    }
    if (step === 2) {
      if (!outlet.name.trim()) {
        toast.error('Nama outlet wajib diisi')
        return
      }
      setStep(3)
      return
    }
  }

  const submit = async () => {
    if (!cashier.name.trim()) return toast.error('Nama kasir wajib diisi')
    if (!/^\d{6}$/.test(cashier.pin)) return toast.error('PIN harus 6 digit angka')
    if (cashier.pin !== cashier.confirmPin) return toast.error('Konfirmasi PIN tidak sama')

    setLoading(true)
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspace, outlet, cashier }),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal menyelesaikan onboarding')
      return
    }
    toast.success('Setup selesai!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      {/* Progress header */}
      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => {
            const reached = step >= s.n
            const completed = step > s.n
            return (
              <div key={s.n} className="flex-1 flex items-center">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`size-9 rounded-full flex items-center justify-center transition-colors ${
                      reached
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {completed ? <Check className="size-4" /> : <s.Icon className="size-4" />}
                  </div>
                  <div className={`text-xs font-semibold ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Step {s.n}
                  </div>
                  <div className={`text-[10px] ${reached ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                    {s.label}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mt-[-26px] transition-colors ${
                      step > s.n ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-6 sm:px-8 py-8">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Tentang toko</h2>
              <p className="text-sm text-muted-foreground mt-1">Info dasar tentang bisnismu.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Nama Toko</Label>
              <Input
                id="ws-name"
                value={workspace.name}
                onChange={(e) => setWorkspace({ ...workspace, name: e.target.value })}
                placeholder="cth. Warung Mama Sumedang"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Jenis Bisnis</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'resto', l: 'Restoran' },
                  { v: 'retail', l: 'Retail' },
                  { v: 'jasa', l: 'Jasa' },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.v}
                    onClick={() =>
                      setWorkspace({ ...workspace, businessType: opt.v as BusinessType })
                    }
                    className={`rounded-lg border p-3 text-sm font-medium transition-all ${
                      workspace.businessType === opt.v
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-address">Alamat</Label>
              <Textarea
                id="ws-address"
                value={workspace.address}
                onChange={(e) => setWorkspace({ ...workspace, address: e.target.value })}
                placeholder="cth. Jl. Mayor Abdurahman No. 12, Sumedang"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-phone">Nomor HP</Label>
              <Input
                id="ws-phone"
                type="tel"
                value={workspace.phone}
                onChange={(e) => setWorkspace({ ...workspace, phone: e.target.value })}
                placeholder="0812xxxxxxx"
              />
            </div>

            <Button onClick={nextStep} className="w-full h-11 font-semibold gap-2">
              Lanjut <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Outlet pertama</h2>
              <p className="text-sm text-muted-foreground mt-1">Kamu bisa tambah outlet lain nanti.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="o-name">Nama Outlet</Label>
              <Input
                id="o-name"
                value={outlet.name}
                onChange={(e) => setOutlet({ ...outlet, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-address">Alamat Outlet</Label>
              <Textarea
                id="o-address"
                value={outlet.address}
                onChange={(e) => setOutlet({ ...outlet, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 gap-2">
                <ArrowLeft className="size-4" /> Kembali
              </Button>
              <Button onClick={nextStep} className="flex-1 h-11 font-semibold gap-2">
                Lanjut <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Kasir pertama (manager)</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kamu sebagai manager. PIN dipakai untuk approve void/refund.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nama Kasir</Label>
              <Input
                id="c-name"
                value={cashier.name}
                onChange={(e) => setCashier({ ...cashier, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-pin">PIN 6-digit</Label>
              <Input
                id="c-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={cashier.pin}
                onChange={(e) =>
                  setCashier({ ...cashier, pin: e.target.value.replace(/\D/g, '') })
                }
                className="text-center text-2xl tracking-[0.5em] h-12"
                placeholder="••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-pin2">Konfirmasi PIN</Label>
              <Input
                id="c-pin2"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={cashier.confirmPin}
                onChange={(e) =>
                  setCashier({ ...cashier, confirmPin: e.target.value.replace(/\D/g, '') })
                }
                className="text-center text-2xl tracking-[0.5em] h-12"
                placeholder="••••••"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 gap-2">
                <ArrowLeft className="size-4" /> Kembali
              </Button>
              <Button
                onClick={submit}
                disabled={loading}
                className="flex-1 h-11 font-semibold gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Menyimpan…
                  </>
                ) : (
                  <>
                    Selesai <Check className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
