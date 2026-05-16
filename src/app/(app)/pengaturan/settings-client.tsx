'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Lock, RefreshCw } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  isCashier?: boolean
  user: { email: string; role: 'user' | 'owner' }
  isWorkspaceOwner: boolean
  workspace: {
    id: string
    name: string
    address: string
    phone: string
    businessType: 'resto' | 'retail' | 'jasa'
    loginCode: string | null
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

export function SettingsClient({ defaultTab, isCashier = false, user, isWorkspaceOwner, workspace, outlet }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [tab, setTab] = useState(defaultTab)
  const [ws, setWs] = useState(workspace)
  const [ou, setOu] = useState(outlet)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [loginCode, setLoginCode] = useState(workspace.loginCode)
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)

  const codeLink =
    typeof window !== 'undefined' && loginCode
      ? `${window.location.origin}/k/${loginCode}`
      : loginCode
        ? `/k/${loginCode}`
        : ''

  const copyText = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(msg)
    } catch {
      toast.error('Gagal menyalin')
    }
  }

  const regenerate = async () => {
    setRegenLoading(true)
    const res = await fetch('/api/workspace/login-code', { method: 'POST' })
    setRegenLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal regenerate code')
      return
    }
    const data = (await res.json()) as { login_code: string }
    setLoginCode(data.login_code)
    toast.success('Login code berhasil di-regenerate')
    setRegenOpen(false)
  }

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
    const body = isCashier
      ? {
          printerIp: ou.printerIp || null,
          printerPort: ou.printerPort || 9100,
        }
      : {
          name: ou.name,
          address: ou.address || null,
          phone: ou.phone || null,
          printerIp: ou.printerIp || null,
          printerPort: ou.printerPort || 9100,
        }
    const res = await fetch(`/api/outlets/${ou.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
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
          {!isCashier && <TabsTrigger value="profile">Profil Toko</TabsTrigger>}
          <TabsTrigger value="outlet">Outlet</TabsTrigger>
          {!isCashier && <TabsTrigger value="account">Akun</TabsTrigger>}
          {!isCashier && <TabsTrigger value="struk">Struk &amp; Print</TabsTrigger>}
          {!isCashier && <TabsTrigger value="integrasi">Integrasi</TabsTrigger>}
          {!isCashier && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
          {!isCashier && <TabsTrigger value="payment">Metode Bayar</TabsTrigger>}
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

        <TabsContent value="outlet" className="space-y-6">
          {isWorkspaceOwner && !isCashier && (
            <div className="rounded-2xl border-2 border-brand-500/30 bg-brand-500/5 p-6 space-y-4 max-w-2xl">
              <div className="flex items-center gap-2">
                <Lock className="size-5 text-brand-700" />
                <h3 className="text-lg font-semibold">Login Kasir</h3>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Kasir akses via link unik di bawah. Bagikan ke Mini PC kasir, jangan ke publik.
              </p>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Kode Login Kasir</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <code className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-lg font-mono tracking-wider min-h-[44px] flex items-center">
                    {loginCode ?? '—'}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() =>
                      loginCode &&
                      copyText(loginCode, 'Kode disalin')
                    }
                    disabled={!loginCode}
                    className="gap-2 min-h-[44px]"
                  >
                    <Copy className="size-4" /> Copy Code
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Link untuk Mini PC Kasir</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <code className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-xs sm:text-sm break-all min-h-[44px] flex items-center">
                    {codeLink || '—'}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => codeLink && copyText(codeLink, 'Link disalin')}
                    disabled={!codeLink}
                    className="gap-2 min-h-[44px]"
                  >
                    <Copy className="size-4" /> Copy Link
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-brand-500/20">
                <p className="text-xs text-muted-foreground">
                  Regenerate akan invalidate link lama &amp; mengeluarkan semua kasir.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setRegenOpen(true)}
                  className="gap-2 min-h-[44px] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                >
                  <RefreshCw className="size-4" /> Regenerate
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
            {isCashier && (
              <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                Sebagai kasir, kamu hanya bisa atur IP printer. Untuk ubah nama/alamat outlet, hubungi owner.
              </div>
            )}
            {!isCashier && (
              <>
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
              </>
            )}
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

      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Login Code?</DialogTitle>
            <DialogDescription>
              Link lama akan langsung invalid. Semua kasir yang sedang login akan dikeluarkan dan harus login ulang dengan link baru.
              <br />
              <br />
              Pastikan kamu sudah siap memberitahu semua kasir dan update bookmark di Mini PC kasir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setRegenOpen(false)}
              disabled={regenLoading}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={regenerate}
              disabled={regenLoading}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {regenLoading ? 'Memproses…' : 'Ya, Regenerate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
