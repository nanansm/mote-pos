'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }
    if (form.password !== form.confirm) {
      toast.error('Konfirmasi password tidak sama')
      return
    }
    setLoading(true)
    const res = await signUp.email({
      email: form.email,
      password: form.password,
      name: form.name || form.email.split('@')[0],
    })
    setLoading(false)
    if (res.error) {
      toast.error(res.error.message ?? 'Gagal sign up')
      return
    }
    toast.success('Akun berhasil dibuat')
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="space-y-1.5 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mulai gratis</h1>
        <p className="text-sm text-muted-foreground">Buat akun dalam 2 menit, tanpa kartu kredit.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nama</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            disabled={loading}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama lengkap"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="nama@email.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={loading}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Min. 8 karakter"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Konfirmasi Password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={loading}
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            placeholder="Ulangi password"
          />
        </div>

        <Button type="submit" className="w-full h-11 text-base font-semibold gap-2" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? 'Memproses…' : 'Daftar Gratis'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Dengan mendaftar, kamu menyetujui Syarat & Ketentuan kami.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link href="/sign-in" className="font-semibold text-foreground hover:underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </div>
  )
}
