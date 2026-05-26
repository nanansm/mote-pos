'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Receipt, Printer, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BackLink } from '@/components/back-link'
import { PrinterSettingsSection } from '@/components/printer-settings-section'

type Settings = {
  autoPrintReceipt: boolean
  autoPrintShiftReport: boolean
  receiptPaperSize: '58mm' | '80mm'
  receiptNote: string | null
  receiptShowPhone: boolean
  receiptShowAddress: boolean
  receiptShowCashier: boolean
  receiptShowTrxNo: boolean
  workspaceName: string
  workspacePhone: string | null
  workspaceAddress: string | null
}

const MAX_NOTE = 500

export function StrukSettings() {
  const [data, setData] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/workspace/receipt-settings')
    if (res.ok) {
      const j: Settings = await res.json()
      setData(j)
      setNote(j.receiptNote ?? '')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = async (patch: Partial<Settings>) => {
    if (!data) return
    setSaving(true)
    const res = await fetch('/api/workspace/receipt-settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error('Gagal simpan')
      return
    }
    setData({ ...data, ...patch })
  }

  const saveNote = async () => {
    if (note.length > MAX_NOTE) {
      toast.error(`Maks ${MAX_NOTE} karakter`)
      return
    }
    await update({ receiptNote: note.trim() || null })
    toast.success('Catatan struk disimpan')
  }

  const previewLines = useMemo(() => note.split('\n'), [note])
  const remaining = MAX_NOTE - note.length

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-8 justify-center">
        <Loader2 className="size-4 animate-spin" /> Memuat…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink href="/pengaturan" />
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Receipt className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pengaturan Struk</h1>
          <p className="text-sm text-muted-foreground">
            Format struk thermal + auto-print + catatan kustom.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="font-bold flex items-center gap-2">
          <Printer className="size-4 text-primary" /> Auto-print
        </h2>
        <Toggle
          label="Auto-print struk saat transaksi selesai"
          desc="Buka tab baru dan trigger print otomatis setelah bayar."
          checked={data.autoPrintReceipt}
          onChange={(v) => update({ autoPrintReceipt: v })}
          disabled={saving}
        />
        <Toggle
          label="Auto-print laporan saat tutup shift"
          desc="Cetak Z-report otomatis setelah shift ditutup."
          checked={data.autoPrintShiftReport}
          onChange={(v) => update({ autoPrintShiftReport: v })}
          disabled={saving}
        />
      </div>

      <PrinterSettingsSection />

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="font-bold">Format Struk</h2>
        <div className="space-y-1.5">
          <Label>Ukuran Kertas</Label>
          <Select
            value={data.receiptPaperSize}
            onValueChange={(v) =>
              update({ receiptPaperSize: (v as '58mm' | '80mm') ?? '80mm' })
            }
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="80mm">80mm (standar)</SelectItem>
              <SelectItem value="58mm">58mm (kompak)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Sesuaikan dengan tipe printer thermal yang dipakai.
          </p>
        </div>
        <Toggle
          label="Tampilkan nomor HP toko di struk"
          desc={data.workspacePhone ? `Kontak: ${data.workspacePhone}` : 'Belum ada HP tersimpan'}
          checked={data.receiptShowPhone}
          onChange={(v) => update({ receiptShowPhone: v })}
          disabled={saving || !data.workspacePhone}
        />
        <Toggle
          label="Tampilkan alamat toko di struk"
          desc={data.workspaceAddress ?? 'Belum ada alamat tersimpan'}
          checked={data.receiptShowAddress}
          onChange={(v) => update({ receiptShowAddress: v })}
          disabled={saving || !data.workspaceAddress}
        />
        <Toggle
          label="Tampilkan nama kasir di struk"
          desc="Baris 'Kasir' pada struk."
          checked={data.receiptShowCashier}
          onChange={(v) => update({ receiptShowCashier: v })}
          disabled={saving}
        />
        <Toggle
          label="Tampilkan nomor transaksi di struk"
          desc="Baris 'No' pada struk."
          checked={data.receiptShowTrxNo}
          onChange={(v) => update({ receiptShowTrxNo: v })}
          disabled={saving}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Catatan Struk</h2>
          <span className={`text-xs ${remaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {remaining} karakter tersisa
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Teks ini muncul di footer struk. Cocok untuk informasi return policy, kontak komplain, jam buka, dll.
        </p>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE + 50))}
          rows={4}
          placeholder="cth. Barang yang sudah dibeli tidak bisa dikembalikan. Komplain hub: 0812-xxx"
        />
        <Button onClick={saveNote} disabled={saving} className="gap-2 font-semibold">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan Catatan
        </Button>

        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 mt-4">
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Preview Footer Struk
          </div>
          <div className="font-mono text-xs space-y-1 text-center max-w-[280px] mx-auto">
            <div>================</div>
            <div className="font-semibold">Terima kasih</div>
            <div>&nbsp;</div>
            {previewLines.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">
                {l || <>&nbsp;</>}
              </div>
            ))}
            <div>================</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-semibold">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
