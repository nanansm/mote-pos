'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  PlugZap,
  Link as LinkIcon,
  Copy,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BackLink } from '@/components/back-link'

type KlirConfig = {
  enabled: boolean
  klirWorkspaceId: string | null
  hasToken: boolean
  lastSyncAt: string | null
}

type SheetsConfig = {
  enabled: boolean
  url: string | null
  sheetId: string | null
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
}

export function IntegrasiClient() {
  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink href="/pengaturan" />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrasi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hubungkan POS dengan ekosistem Klir + Google Sheets backup.
        </p>
      </div>
      <Tabs defaultValue="klir">
        <TabsList>
          <TabsTrigger value="klir" className="gap-2">
            <PlugZap className="size-4" /> Klir Sync
          </TabsTrigger>
          <TabsTrigger value="sheets" className="gap-2">
            <FileSpreadsheet className="size-4" /> Google Sheets
          </TabsTrigger>
        </TabsList>
        <TabsContent value="klir">
          <KlirTab />
        </TabsContent>
        <TabsContent value="sheets">
          <SheetsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KlirTab() {
  const [config, setConfig] = useState<KlirConfig | null>(null)
  const [klirWorkspaceId, setKlirWorkspaceId] = useState('')
  const [klirApiToken, setKlirApiToken] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/sync/klir-config')
    const j: KlirConfig = await res.json()
    setConfig(j)
    setEnabled(j.enabled)
    setKlirWorkspaceId(j.klirWorkspaceId ?? '')
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    const body: Record<string, unknown> = { enabled, klirWorkspaceId: klirWorkspaceId || null }
    if (klirApiToken.trim()) body.klirApiToken = klirApiToken.trim()
    const res = await fetch('/api/sync/klir-config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error('Gagal simpan konfigurasi')
      return
    }
    toast.success('Konfigurasi disimpan')
    setKlirApiToken('')
    load()
  }

  const testConn = async () => {
    setTesting(true)
    const res = await fetch('/api/sync/klir-test', { method: 'POST' })
    setTesting(false)
    const j = await res.json().catch(() => ({}))
    if (res.ok) toast.success('Koneksi ke Klir OK')
    else toast.error(`Koneksi gagal: ${j.error ?? res.status}`)
  }

  const syncNow = async () => {
    setSyncing(true)
    const res = await fetch('/api/sync/manual', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    setSyncing(false)
    const j = await res.json().catch(() => ({}))
    if (res.ok && j.ok) {
      toast.success('Sync ke Klir berhasil')
      load()
    } else {
      toast.error(`Sync gagal: ${j.error ?? 'unknown'}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-8 justify-center">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <PlugZap className="size-5" />
          </div>
          <div>
            <h2 className="font-bold">Aktifkan Sync ke Klir</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Saat aktif, ringkasan penjualan tiap hari dikirim ke Klir.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => setEnabled(v)} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="font-bold">Kredensial Klir</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dapatkan dari akun Klir kamu di{' '}
            <a
              href="https://klir.motekreatif.com/pengaturan/integrasi"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              klir.motekreatif.com
            </a>
            .
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-id">Klir Workspace ID</Label>
          <Input
            id="ws-id"
            value={klirWorkspaceId}
            onChange={(e) => setKlirWorkspaceId(e.target.value)}
            placeholder="cth. ws_xxxx"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="token">Klir API Token</Label>
          <Input
            id="token"
            type="password"
            value={klirApiToken}
            onChange={(e) => setKlirApiToken(e.target.value)}
            placeholder={config?.hasToken ? '•••••••••• (sudah diset)' : 'Paste token di sini'}
          />
          {config?.hasToken && (
            <p className="text-xs text-success flex items-center gap-1.5">
              <CheckCircle2 className="size-3" /> Token sudah tersimpan
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="font-semibold gap-2">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Simpan
          </Button>
          <Button variant="outline" onClick={testConn} disabled={testing || !config?.hasToken} className="gap-2">
            {testing ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
            Test Koneksi
          </Button>
          <Button
            variant="outline"
            onClick={syncNow}
            disabled={syncing || !enabled || !config?.hasToken}
            className="gap-2 sm:ml-auto"
          >
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            Sync Sekarang
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
        <h2 className="font-bold">Status</h2>
        <div className="text-sm flex items-center gap-2">
          {enabled && config?.hasToken ? (
            <>
              <CheckCircle2 className="size-4 text-success" />
              <span>Sync aktif</span>
            </>
          ) : (
            <>
              <XCircle className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sync belum aktif / token belum diset</span>
            </>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Sync terakhir:{' '}
          {config?.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString('id-ID') : '— belum pernah'}
        </div>
      </div>
    </div>
  )
}

function SheetsTab() {
  const [config, setConfig] = useState<SheetsConfig | null>(null)
  const [serviceEmail, setServiceEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<
    | { ok: true; title: string; sheetId: string }
    | { ok: false; error: string }
    | null
  >(null)
  const [enabling, setEnabling] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [howOpen, setHowOpen] = useState(true)

  const load = async () => {
    setLoading(true)
    const [c, s] = await Promise.all([
      fetch('/api/workspace/sheets-sync').then((r) => r.json()),
      fetch('/api/sheets-sync/test').then((r) => r.json()),
    ])
    setConfig(c)
    setServiceEmail(s.serviceEmail ?? null)
    setUrl(c?.url ?? '')
    if (c?.enabled) setHowOpen(false)
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const test = async () => {
    if (!url.trim()) return toast.error('Paste URL Google Sheet')
    setTesting(true)
    const res = await fetch('/api/sheets-sync/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    setTesting(false)
    const j = await res.json().catch(() => ({}))
    if (res.ok) {
      setTestResult({ ok: true, title: j.title, sheetId: j.sheetId })
      toast.success(`Terhubung: ${j.title}`)
    } else {
      setTestResult({ ok: false, error: j.error ?? 'gagal' })
      toast.error(j.error ?? 'Koneksi gagal')
    }
  }

  const activate = async () => {
    if (!testResult?.ok) return
    setEnabling(true)
    const res = await fetch('/api/workspace/sheets-sync', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, enabled: true }),
    })
    setEnabling(false)
    if (!res.ok) {
      toast.error('Gagal mengaktifkan')
      return
    }
    toast.success('Backup harian aktif')
    load()
  }

  const deactivate = async () => {
    if (!confirm('Matikan backup harian ke Google Sheets?')) return
    setEnabling(true)
    const res = await fetch('/api/workspace/sheets-sync', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    })
    setEnabling(false)
    if (!res.ok) return toast.error('Gagal')
    toast.success('Backup dinonaktifkan')
    load()
  }

  const syncNow = async () => {
    setSyncing(true)
    const res = await fetch('/api/sheets-sync/manual', { method: 'POST' })
    setSyncing(false)
    const j = await res.json().catch(() => ({}))
    if (res.ok && j.ok) {
      toast.success(`Sukses, ${j.tabsCount} tab terupdate`)
      load()
    } else {
      toast.error(j.error ?? 'Sync gagal')
      load()
    }
  }

  const copyEmail = async () => {
    if (!serviceEmail) return
    try {
      await navigator.clipboard.writeText(serviceEmail)
      toast.success('Email service account di-copy')
    } catch {
      toast.error('Gagal copy. Tahan + copy manual.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-8 justify-center">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    )
  }

  const isActive = config?.enabled === true

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileSpreadsheet className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold">Backup ke Google Sheets</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Backup data POS otomatis tiap hari jam 23:50. 6 tab: Transaksi, Items, Pelanggan,
                Hutang, Produk, Shift.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-xs font-bold">
                <CheckCircle2 className="size-3" /> Aktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-xs font-bold">
                Tidak aktif
              </span>
            )}
          </div>
        </div>

        {/* Service account banner — always visible */}
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
            {serviceEmail ? (
              <>
                <CheckCircle2 className="size-3.5 text-success" />
                Service Account (tambahkan sebagai Editor di Google Sheet)
              </>
            ) : (
              <>
                <XCircle className="size-3.5 text-destructive" />
                Service Account belum diset di server
              </>
            )}
          </div>
          {serviceEmail ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono break-all bg-card border border-border rounded-md px-2.5 py-2 min-w-0">
                {serviceEmail}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyEmail}
                className="shrink-0 gap-1.5 min-h-[40px]"
                aria-label="Copy email"
              >
                <Copy className="size-3.5" /> Copy
              </Button>
            </div>
          ) : (
            <p className="text-xs text-destructive">
              <code className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</code> belum di-set di{' '}
              <code className="font-mono">.env.local</code> server. Paste JSON service account, restart server.
            </p>
          )}
        </div>
      </div>

      <details
        className="rounded-2xl border border-border bg-card overflow-hidden"
        open={howOpen}
        onToggle={(e) => setHowOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="px-6 py-4 cursor-pointer font-bold flex items-center justify-between gap-2 list-none">
          <span>📖 Cara Setup (klik untuk expand)</span>
          <span className="text-xs text-muted-foreground font-normal">
            {howOpen ? 'tutup' : 'buka'}
          </span>
        </summary>
        <div className="px-6 pb-6 space-y-5 text-sm">
          <ol className="space-y-4 list-decimal pl-5">
            <li>
              Buat Google Sheet kosong baru di{' '}
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 font-semibold hover:underline underline-offset-4"
              >
                sheets.new <ExternalLink className="size-3" />
              </a>
              .
            </li>
            <li>
              Klik tombol <strong>&quot;Share&quot;</strong> (Bagikan) di kanan atas Google Sheet, lalu tambahkan email
              berikut sebagai <strong>Editor</strong>:
              <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-2">
                <code className="flex-1 text-xs font-mono break-all">
                  {serviceEmail ?? '(GOOGLE_SERVICE_ACCOUNT_JSON belum diset di server)'}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyEmail}
                  disabled={!serviceEmail}
                  className="gap-1.5"
                >
                  <Copy className="size-3.5" /> Copy
                </Button>
              </div>
            </li>
            <li>
              Copy <strong>FULL URL</strong> Google Sheet dari address bar, paste di field di bawah.
              Jangan copy ID saja — kami extract otomatis.
            </li>
            <li>
              Klik <strong>&quot;Test Koneksi&quot;</strong>. Kalau sukses, klik <strong>&quot;Aktifkan
              Backup Harian&quot;</strong>.
            </li>
          </ol>
        </div>
      </details>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sheet-url">URL Google Sheet</Label>
          <Input
            id="sheet-url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setTestResult(null)
            }}
            placeholder="https://docs.google.com/spreadsheets/d/xxxxxx/edit"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={test}
            disabled={testing || !url.trim()}
            className="gap-2 font-semibold"
            variant="outline"
          >
            {testing ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
            Test Koneksi
          </Button>
          {isActive ? (
            <Button onClick={deactivate} disabled={enabling} variant="outline" className="gap-2">
              {enabling && <Loader2 className="size-4 animate-spin" />}
              Matikan
            </Button>
          ) : (
            <Button
              onClick={activate}
              disabled={enabling || !testResult?.ok}
              className="gap-2 font-semibold"
            >
              {enabling && <Loader2 className="size-4 animate-spin" />}
              <CheckCircle2 className="size-4" />
              Aktifkan Backup Harian
            </Button>
          )}
        </div>

        {testResult && (
          <div
            className={`rounded-lg p-3 text-sm ${
              testResult.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}
          >
            {testResult.ok ? (
              <span className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4" /> Terhubung: {testResult.title}
              </span>
            ) : (
              <span className="flex items-start gap-2">
                <XCircle className="size-4 mt-0.5 shrink-0" /> {testResult.error}
              </span>
            )}
          </div>
        )}
      </div>

      {isActive && (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-bold">POS → Sheet (Backup)</h2>
            <p className="text-sm text-muted-foreground">
              Kirim semua data POS (Transaksi, Items, Pelanggan, Hutang, Produk, Shift) ke Google
              Sheet. Mode replace — selalu state terkini.
            </p>
            <div className="text-sm text-muted-foreground">
              Sync terakhir:{' '}
              <strong className="text-foreground">
                {config?.lastSyncAt
                  ? new Date(config.lastSyncAt).toLocaleString('id-ID')
                  : '— belum pernah'}
              </strong>{' '}
              ·{' '}
              {config?.lastSyncStatus === 'success' ? (
                <span className="text-success font-semibold">✓ Sukses</span>
              ) : config?.lastSyncStatus === 'failed' ? (
                <span className="text-destructive font-semibold">✗ Gagal</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            {config?.lastSyncError && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-xs p-2">
                {config.lastSyncError}
              </div>
            )}
            <Button onClick={syncNow} disabled={syncing} className="gap-2 font-semibold min-h-[44px]">
              {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
              Sync Sekarang
            </Button>
          </div>

          <ImportFromSheetCard />
        </>
      )}
    </div>
  )
}

function ImportFromSheetCard() {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<
    | null
    | {
        ok: true
        groupsCreated: number
        groupsUpdated: number
        variantsCreated: number
        variantsUpdated: number
        skipped: number
        errors: { row: number; reason: string }[]
      }
    | { ok: false; error: string }
  >(null)

  const run = async () => {
    if (
      !confirm(
        'Import produk dari tab "Produk" di Google Sheet ke POS?\n\nProduk baru akan dibuat, produk existing (match SKU atau nama+variant) akan di-update.',
      )
    )
      return
    setImporting(true)
    setResult(null)
    const res = await fetch('/api/sheets-sync/import-products', { method: 'POST' })
    setImporting(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) {
      setResult({ ok: false, error: j.error ?? 'Gagal import' })
      toast.error(j.error ?? 'Gagal import dari Sheet')
      return
    }
    setResult(j)
    const total = (j.variantsCreated ?? 0) + (j.variantsUpdated ?? 0)
    toast.success(
      `Import selesai: ${total} variant (${j.variantsCreated} baru, ${j.variantsUpdated} update)`,
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <RefreshCcw className="size-4 rotate-180" />
        </div>
        <div>
          <h2 className="font-bold">Sheet → POS (Import Produk)</h2>
          <p className="text-sm text-muted-foreground">
            Baca tab <strong>&quot;Produk&quot;</strong> di Google Sheet dan import ke POS.
            Match by SKU atau Nama+Variant. Tidak auto-sync — klik tombol di bawah saat butuh.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Format kolom Sheet:</strong> Produk · Variant · SKU · Barcode · Harga Jual · Harga Modal ·
          Satuan · Stok · Aktif
        </p>
        <p>
          Header harus persis. Stok kosong = tidak dilacak. Aktif: ya/tidak.
        </p>
      </div>
      <Button onClick={run} disabled={importing} className="gap-2 font-semibold min-h-[44px]">
        {importing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4 rotate-180" />}
        Import Produk dari Sheet
      </Button>
      {result && result.ok && (
        <div className="rounded-lg bg-success/10 text-success text-sm p-3 space-y-1">
          <div className="font-semibold">✓ Import selesai</div>
          <div className="text-xs">
            {result.variantsCreated} variant baru · {result.variantsUpdated} update ·{' '}
            {result.groupsCreated} produk induk baru · {result.skipped} skip
          </div>
          {result.errors.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold">
                {result.errors.length} error
              </summary>
              <ul className="mt-1 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i}>Baris {e.row}: {e.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {result && !result.ok && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">
          <XCircle className="inline size-4 mr-1.5" />
          {result.error}
        </div>
      )}
    </div>
  )
}
