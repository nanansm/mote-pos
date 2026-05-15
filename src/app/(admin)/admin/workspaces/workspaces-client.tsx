'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
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
  businessType: string
  ownerEmail: string | null
  outletCount: number
  productCount: number
  trxCount: number
  gmvTotal: number
  createdAt: string
}

type ApiResp = { data: Row[]; total: number; page: number; limit: number }

export function AdminWorkspacesClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [bt, setBt] = useState<'all' | 'resto' | 'retail' | 'jasa'>('all')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    if (bt !== 'all') params.set('business_type', bt)
    const res = await fetch(`/api/admin/workspaces?${params.toString()}`)
    const j: ApiResp = await res.json()
    setRows(j.data ?? [])
    setTotal(j.total ?? 0)
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, bt])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Workspaces</h1>
        <p className="text-sm text-slate-400 mt-1">Semua toko terdaftar di platform.</p>
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
            placeholder="Cari nama toko / email owner…"
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100"
          />
        </form>
        <Select value={bt} onValueChange={(v) => setBt((v as 'all' | 'resto' | 'retail' | 'jasa') ?? 'all')}>
          <SelectTrigger className="sm:w-44 bg-slate-900 border-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="resto">Restoran</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="jasa">Jasa</SelectItem>
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
            Tidak ada workspace yang cocok.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 text-slate-400 text-left">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Toko</th>
                    <th className="px-5 py-2.5 font-semibold">Type</th>
                    <th className="px-5 py-2.5 font-semibold">Owner Email</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Outlet</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Produk</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Trx</th>
                    <th className="px-5 py-2.5 font-semibold text-right">GMV</th>
                    <th className="px-5 py-2.5 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-3 font-semibold">{w.name}</td>
                      <td className="px-5 py-3 text-slate-400 uppercase text-xs font-semibold">
                        {w.businessType}
                      </td>
                      <td className="px-5 py-3 text-slate-300">{w.ownerEmail ?? '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {w.outletCount}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {w.productCount}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {w.trxCount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {formatRupiah(w.gmvTotal)}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(w.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 text-sm text-slate-400">
              <div>
                {total} workspace · halaman {page} dari {totalPages}
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
