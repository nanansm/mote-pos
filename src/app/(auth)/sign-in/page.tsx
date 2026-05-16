'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'

export default function SignInPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await signIn.email({
      email: form.email,
      password: form.password,
    })
    setLoading(false)
    if (res.error) {
      toast.error(res.error.message ?? 'Email atau password salah')
      return
    }
    toast.success('Berhasil masuk')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="space-y-1.5 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Masuk</h1>
        <p className="text-sm text-muted-foreground">Lanjutkan kelola tokomu.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => toast.info('Reset password akan tersedia di update berikutnya.')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Lupa password?
            </button>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full h-11 text-base font-semibold gap-2" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link href="/sign-up" className="font-semibold text-foreground hover:underline underline-offset-4">
          Daftar gratis
        </Link>
      </p>
    </div>
  )
}
