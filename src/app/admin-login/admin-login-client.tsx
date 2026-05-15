'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminLoginClient() {
  const router = useRouter()
  const params = useSearchParams()
  const denied = params.get('denied') === '1'
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  useEffect(() => {
    if (denied) {
      toast.error('Akun ini bukan owner panel access')
    }
  }, [denied])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await signIn.email({
      email: form.email,
      password: form.password,
    })
    if (res.error) {
      setLoading(false)
      toast.error(res.error.message ?? 'Email atau password salah')
      return
    }
    // Check role
    try {
      const me = await fetch('/api/admin/me', { cache: 'no-store' })
      setLoading(false)
      if (me.status === 200) {
        toast.success('Welcome, owner')
        router.push('/admin')
        router.refresh()
      } else {
        toast.error('Bukan owner — diarahkan ke dashboard biasa')
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setLoading(false)
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="size-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Owner Panel</h1>
          <p className="text-sm text-slate-400 mt-1">Mote POS internal access only.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-7 space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="owner@mote.id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-100"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 font-semibold gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Bukan owner? <a href="/sign-in" className="text-slate-300 hover:underline">Login biasa</a>
        </p>
      </div>
    </div>
  )
}
