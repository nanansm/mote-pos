'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'

type Row = {
  id: string
  name: string
  email: string
  role: 'user' | 'owner'
  workspaceName: string | null
  trxCount: number
  gmvTotal: number
  createdAt: string
}
type ApiResp = { data: Row[]; total: number; page: number; limit: number }

export function AdminUsersClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'all' | 'user' | 'owner'>('all')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    if (role !== 'all') params.set('role', role)
    const res = await fetch(`/api/admin/users?${params.toString()}`)
    const j: ApiResp = await res.json()
    setRows(j.data ?? [])
    setTotal(j.total ?? 0)
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role])

  const toggleRole = async (u: Row) => {
    const next = u.role === 'owner' ? 'user' : 'owner'
    if (!confirm(`Ubah role ${u.email} jadi "${next}"?`)) return
    const res = await fetch(`/api/admin/users/${u.id}/role`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: next }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal ubah role')
      return
    }
    toast.success(`Role diubah jadi ${next}`)
    load()
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-slate-400 mt-1">Manage user accounts across the platform.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            load()
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / email…"
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100"
          />
        </form>
        <Select value={role} onValueChange={(v) => setRole((v as 'all' | 'user' | 'owner') ?? 'all')}>
          <SelectTrigger className="sm:w-40 bg-slate-900 border-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Tidak ada user yang cocok.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 text-slate-400 text-left">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Name</th>
                    <th className="px-5 py-2.5 font-semibold">Email</th>
                    <th className="px-5 py-2.5 font-semibold">Workspace</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Trx</th>
                    <th className="px-5 py-2.5 font-semibold text-right">GMV</th>
                    <th className="px-5 py-2.5 font-semibold">Joined</th>
                    <th className="px-5 py-2.5 font-semibold">Role</th>
                    <th className="px-5 py-2.5 font-semibold w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-3 font-semibold">{u.name}</td>
                      <td className="px-5 py-3 text-slate-300">{u.email}</td>
                      <td className="px-5 py-3 text-slate-400">{u.workspaceName ?? '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {u.trxCount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {formatRupiah(u.gmvTotal)}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            u.role === 'owner'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.role === 'owner' ? (
                            <ShieldCheck className="size-3" />
                          ) : (
                            <UserIcon className="size-3" />
                          )}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRole(u)}
                          className="bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800"
                        >
                          {u.role === 'owner' ? 'Demote' : 'Promote'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 text-sm text-slate-400">
              <div>
                {total} user · halaman {page} dari {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
