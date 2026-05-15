'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Receipt, PlugZap, ShieldAlert, ArrowRight } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
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

export function SettingsClient({ user, workspace, outlet }: Props) {
  const [ws, setWs] = useState(workspace)
  const [ou, setOu] = useState(outlet)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)

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
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Pengaturan
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Atur profil toko, outlet, dan akun kamu.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SettingsLink href="/pengaturan/struk" Icon={Receipt} title="Struk & Print" desc="Format struk, auto-print, catatan kustom" />
        <SettingsLink href="/pengaturan/integrasi" Icon={PlugZap} title="Integrasi" desc="Sync Klir + Google Sheets backup" />
        <SettingsLink href="/pengaturan/audit" Icon={ShieldAlert} title="Audit Log" desc="Riwayat aksi sensitif manager" />
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil Toko</TabsTrigger>
          <TabsTrigger value="outlet">Outlet</TabsTrigger>
          <TabsTrigger value="account">Akun</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 max-w-2xl">
            <div>
              <Label>Nama Toko</Label>
              <Input
                value={ws.name}
                onChange={(e) => setWs({ ...ws, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Jenis Bisnis</Label>
              <Select
                value={ws.businessType}
                onValueChange={(v) =>
                  setWs({ ...ws, businessType: v as 'resto' | 'retail' | 'jasa' })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resto">Restoran</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="jasa">Jasa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alamat</Label>
              <Textarea
                value={ws.address}
                onChange={(e) => setWs({ ...ws, address: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label>Nomor HP</Label>
              <Input
                value={ws.phone}
                onChange={(e) => setWs({ ...ws, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button onClick={saveWs} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="outlet">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 max-w-2xl">
            <div>
              <Label>Nama Outlet</Label>
              <Input
                value={ou.name}
                onChange={(e) => setOu({ ...ou, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Alamat Outlet</Label>
              <Textarea
                value={ou.address}
                onChange={(e) => setOu({ ...ou, address: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label>Telepon Outlet</Label>
              <Input
                value={ou.phone}
                onChange={(e) => setOu({ ...ou, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Format struk thermal, auto-print, dan catatan struk diatur di{' '}
              <a href="/pengaturan/struk" className="text-primary font-semibold underline-offset-4 hover:underline">
                Pengaturan → Struk
              </a>
              .
            </div>
            <Button onClick={saveOutlet} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 max-w-2xl">
            <div>
              <Label>Email</Label>
              <Input value={user.email} disabled className="mt-1" />
              <p className="text-xs text-neutral-500 mt-1">
                Ubah email akan tersedia di update berikutnya.
              </p>
            </div>
            <div className="border-t border-neutral-200 pt-4">
              <h3 className="font-medium text-neutral-900">Ganti Password</h3>
            </div>
            <div>
              <Label>Password saat ini</Label>
              <Input
                type="password"
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Password baru</Label>
              <Input
                type="password"
                value={pwd.next}
                onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Konfirmasi password baru</Label>
              <Input
                type="password"
                value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button onClick={savePassword} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Ganti Password'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SettingsLink({
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
      className="group rounded-2xl border border-border bg-card p-4 hover:border-primary hover:shadow-md transition-all flex items-start gap-3"
    >
      <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
    </Link>
  )
}
