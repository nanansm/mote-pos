'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StrukSettings } from './struk/struk-settings'
import { IntegrasiClient } from './integrasi/integrasi-client'
import { AuditClient } from './audit/audit-client'
import { PaymentMethodsClient } from './payment-methods-client'

type Props = {
  defaultTab: string
  user: { email: string }
  workspace: {
    id: string
    name: string
    address: string
    phone: string
    businessType: 'resto' | 'retail' | 'jasa'
  }
  outlet: {
    id: string
    name: string
    address: string
    phone: string
    printerIp: string
    printerPort: number
  }
}

export function SettingsClient({ defaultTab, user, workspace, outlet }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [tab, setTab] = useState(defaultTab)
  const [ws, setWs] = useState(workspace)
  const [ou, setOu] = useState(outlet)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const urlTab = sp.get('tab')
    if (urlTab && urlTab !== tab) setTab(urlTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  const onTabChange = (next: string) => {
    setTab(next)
    const params = new URLSearchParams(sp.toString())
    params.set('tab', next)
    router.replace(`/pengaturan?${params.toString()}`)
  }

  const saveWs = async () => {
    setSaving(true)
    const res = await fetch('/api/workspace', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: ws.name,
        address: ws.address || null,
        phone: ws.phone || null,
        businessType: ws.businessType,
      }),
    })
    setSaving(false)
    if (!res.ok) return toast.error('Gagal menyimpan')
    toast.success('Profil toko diperbarui')
  }

  const saveOutlet = async () => {
    setSaving(true)
    const res = await fetch(`/api/outlets/${ou.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: ou.name,
        address: ou.address || null,
        phone: ou.phone || null,
        printerIp: ou.printerIp || null,
        printerPort: ou.printerPort || 9100,
      }),
    })
    setSaving(false)
    if (!res.ok) return toast.error('Gagal menyimpan')
    toast.success('Outlet diperbarui')
  }

  const savePassword = async () => {
    if (pwd.next.length < 8) return toast.error('Password baru min. 8 karakter')
    if (pwd.next !== pwd.confirm) return toast.error('Konfirmasi tidak sama')
    setSaving(true)
    const res = await fetch('/api/account/password', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return toast.error(j.error ?? 'Gagal ganti password')
    }
    setPwd({ current: '', next: '', confirm: '' })
    toast.success('Password diperbarui')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Pengaturan</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Atur profil toko, outlet, akun, struk, integrasi.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList variant="line" className="flex-wrap h-auto justify-start gap-1">
          <TabsTrigger value="profile">Profil Toko</TabsTrigger>
          <TabsTrigger value="outlet">Outlet</TabsTrigger>
          <TabsTrigger value="account">Akun</TabsTrigger>
          <TabsTrigger value="struk">Struk &amp; Print</TabsTrigger>
          <TabsTrigger value="integrasi">Integrasi</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="payment">Metode Bayar</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
            <div className="space-y-1.5">
              <Label>Nama Toko</Label>
              <Input value={ws.name} onChange={(e) => setWs({ ...ws, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Bisnis</Label>
              <Select
                value={ws.businessType}
                onValueChange={(v) =>
                  setWs({ ...ws, businessType: v as 'resto' | 'retail' | 'jasa' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resto">Restoran</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="jasa">Jasa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Textarea
                value={ws.address}
                onChange={(e) => setWs({ ...ws, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor HP</Label>
              <Input value={ws.phone} onChange={(e) => setWs({ ...ws, phone: e.target.value })} />
            </div>
            <Button
              onClick={saveWs}
              disabled={saving}
              className="font-semibold transition-colors hover:bg-brand-500/90"
            >
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="outlet">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
            <div className="space-y-1.5">
              <Label>Nama Outlet</Label>
              <Input value={ou.name} onChange={(e) => setOu({ ...ou, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Alamat Outlet</Label>
              <Textarea
                value={ou.address}
                onChange={(e) => setOu({ ...ou, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telepon Outlet</Label>
              <Input value={ou.phone} onChange={(e) => setOu({ ...ou, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="outlet-printer-ip">IP Printer Thermal (opsional)</Label>
                <Input
                  id="outlet-printer-ip"
                  value={ou.printerIp}
                  onChange={(e) => setOu({ ...ou, printerIp: e.target.value })}
                  placeholder="cth. 192.168.1.50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outlet-printer-port">Port</Label>
                <Input
                  id="outlet-printer-port"
                  type="number"
                  inputMode="numeric"
                  value={ou.printerPort || ''}
                  onChange={(e) =>
                    setOu({ ...ou, printerPort: parseInt(e.target.value || '9100', 10) })
                  }
                  placeholder="9100"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Untuk visioner LAN printer. Kosongkan kalau cetak via browser saja.
            </p>
            <Button
              onClick={saveOutlet}
              disabled={saving}
              className="font-semibold transition-colors hover:bg-brand-500/90"
            >
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user.email} disabled />
              <p className="text-xs text-muted-foreground">
                Ubah email akan tersedia di update berikutnya.
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold">Ganti Password</h3>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd-current">Password saat ini</Label>
              <PasswordInput
                id="pwd-current"
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd-next">Password baru</Label>
              <PasswordInput
                id="pwd-next"
                value={pwd.next}
                onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd-confirm">Konfirmasi password baru</Label>
              <PasswordInput
                id="pwd-confirm"
                value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              />
            </div>
            <Button
              onClick={savePassword}
              disabled={saving}
              className="font-semibold transition-colors hover:bg-brand-500/90"
            >
              {saving ? 'Menyimpan…' : 'Ganti Password'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="struk">
          <StrukSettings />
        </TabsContent>

        <TabsContent value="integrasi">
          <IntegrasiClient />
        </TabsContent>

        <TabsContent value="audit">
          <AuditClient />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentMethodsClient />
        </TabsContent>
      </Tabs>
    </div>
  )
}
