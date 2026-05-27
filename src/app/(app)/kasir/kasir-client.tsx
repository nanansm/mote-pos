'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { printTransaction } from '@/lib/print/receipt'
import { NumberPadPopup } from '@/components/number-pad-popup'
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  Edit3,
  Lock,
  Bookmark,
  Loader2,
  X,
  Wifi,
  ChevronRight,
  Tag,
  ScanLine,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  generateQuickAmounts,
  QuickAmountGrid,
} from '@/components/kasir/cash-amount-input'
import { formatRupiah } from '@/lib/format'

type Category = { id: string; name: string }
type VariantUi = {
  id: string
  variantName: string | null
  priceSell: number
  unit: string
  barcode: string | null
  stockTrack: boolean
  stockCurrent: number
  modifierGroupIds: string[]
}
type ProductGroupUi = {
  id: string
  name: string
  categoryId: string | null
  variants: VariantUi[]
}
// Backward-compat alias for the picker/cart code
type ProductUi = {
  id: string // variant id
  groupId: string
  groupName: string
  variantName: string | null
  name: string // group + variant display
  priceSell: number
  unit: string
  barcode: string | null
  stockTrack: boolean
  stockCurrent: number
  categoryId: string | null
  modifierGroupIds: string[]
}
type ModifierOptionUi = { id: string; name: string; priceAdd: number }
type ModifierGroupUi = {
  id: string
  name: string
  type: 'single' | 'multiple'
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: ModifierOptionUi[]
}
type CartModifier = {
  groupId: string
  name: string
  options: { id: string; name: string; priceAdd: number }[]
}
type CartItem = {
  uid: string
  productId: string
  name: string
  priceUnit: number
  originalPrice: number
  quantity: number
  modifiers: CartModifier[]
  modifierTotal: number
  discount: number
  discountType: 'amount' | 'percent'
  notes?: string
}

type CustomerHit = {
  id: string
  name: string
  phone: string | null
  totalDebt: number
}

type PaymentMethodOpt = {
  id: string
  code: string
  label: string
  type: 'cash' | 'cashless' | 'debt' | 'deposit'
  isActive: boolean
}

type Payment = {
  uid: string
  method: string
  amount: number
}

type HeldCart = {
  id: string
  label: string
  customerName: string | null
  customerPhone: string | null
  customerId: string | null
  subtotal: number
  itemCount: number
  createdAt: string
  cartData: { items: CartItem[]; discount: number; discountType: 'amount' | 'percent' }
}

const uidGen = () => Math.random().toString(36).slice(2, 11)

function computeItemSubtotal(it: Pick<CartItem, 'priceUnit' | 'modifierTotal' | 'quantity' | 'discount' | 'discountType'>) {
  const gross = (it.priceUnit + it.modifierTotal) * it.quantity
  const disc = it.discountType === 'percent' ? gross * (it.discount / 100) : it.discount
  return Math.max(0, gross - disc)
}

function variantToProduct(
  group: ProductGroupUi,
  v: VariantUi,
): ProductUi {
  const display = v.variantName ? `${group.name} - ${v.variantName}` : group.name
  return {
    id: v.id,
    groupId: group.id,
    groupName: group.name,
    variantName: v.variantName,
    name: display,
    priceSell: v.priceSell,
    unit: v.unit,
    barcode: v.barcode,
    stockTrack: v.stockTrack,
    stockCurrent: v.stockCurrent,
    categoryId: group.categoryId,
    modifierGroupIds: v.modifierGroupIds,
  }
}

export function KasirClient({
  categories,
  productGroups,
  modifierGroups,
  autoPrint,
}: {
  categories: Category[]
  productGroups: ProductGroupUi[]
  modifierGroups: ModifierGroupUi[]
  autoPrint: boolean
}) {
  const products: ProductUi[] = useMemo(
    () => productGroups.flatMap((g) => g.variants.map((v) => variantToProduct(g, v))),
    [productGroups],
  )
  const [variantPickerGroup, setVariantPickerGroup] = useState<ProductGroupUi | null>(null)
  const router = useRouter()
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [cashierId, setCashierId] = useState<string | null>(null)
  const [cashierName, setCashierName] = useState<string>('')
  const [openedAt, setOpenedAt] = useState<string>('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')

  const [filterCat, setFilterCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const [pickProduct, setPickProduct] = useState<ProductUi | null>(null)
  const [pickSelections, setPickSelections] = useState<Record<string, ModifierOptionUi[]>>({})
  const [pickQuantity, setPickQuantity] = useState(1)

  const [detailItem, setDetailItem] = useState<CartItem | null>(null)
  const [overridePrice, setOverridePrice] = useState(0)
  const [overridePinOpen, setOverridePinOpen] = useState(false)
  const [overridePin, setOverridePin] = useState('')
  const [overrideUnlocked, setOverrideUnlocked] = useState(false)
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [activeHeldCartId, setActiveHeldCartId] = useState<string | null>(null)
  const [customerHits, setCustomerHits] = useState<CustomerHit[]>([])
  const [payments, setPayments] = useState<Payment[]>([
    { uid: uidGen(), method: 'cash', amount: 0 },
  ])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [paymentMethodsOpts, setPaymentMethodsOpts] = useState<PaymentMethodOpt[]>([])
  const [pickupPending, setPickupPending] = useState(false)
  const [pickupNotes, setPickupNotes] = useState('')
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([])
  const [heldOpen, setHeldOpen] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdLabel, setHoldLabel] = useState('')

  const [successTrx, setSuccessTrx] = useState<{
    id: string
    trxNumber: string
    total: number
    change: number
  } | null>(null)

  // Mobile/tablet cart drawer (slide-up). Desktop sidebar is always visible.
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [qtyPad, setQtyPad] = useState<{ uid: string; name: string; value: number } | null>(null)
  const [discountPadOpen, setDiscountPadOpen] = useState(false)
  const [detailQtyPadOpen, setDetailQtyPadOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sid = localStorage.getItem('pos:shift_id')
    const cid = localStorage.getItem('pos:cashier_id')
    const cn = localStorage.getItem('pos:cashier_name') ?? ''
    const oa = localStorage.getItem('pos:shift_opened_at') ?? ''
    if (!sid || !cid) {
      router.replace('/kasir/buka-shift')
      return
    }
    setShiftId(sid)
    setCashierId(cid)
    setCashierName(cn)
    setOpenedAt(oa)
    const saved = localStorage.getItem(`pos:cart:${sid}`)
    if (saved) {
      try {
        setCart(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [router])

  useEffect(() => {
    if (!shiftId || typeof window === 'undefined') return
    localStorage.setItem(`pos:cart:${shiftId}`, JSON.stringify(cart))
  }, [cart, shiftId])

  const loadHeld = useCallback(async () => {
    const res = await fetch('/api/held-carts')
    if (!res.ok) return
    const j = await res.json()
    setHeldCarts(j.data ?? [])
  }, [])
  useEffect(() => {
    loadHeld()
  }, [loadHeld])

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/payment-methods?active=true')
      if (!res.ok) return
      const j = await res.json()
      setPaymentMethodsOpts(j.data ?? [])
    })()
  }, [])

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase()
    return productGroups.filter((g) => {
      if (filterCat !== 'all' && g.categoryId !== filterCat) return false
      if (!q) return true
      if (g.name.toLowerCase().includes(q)) return true
      return g.variants.some((v) => (v.variantName ?? '').toLowerCase().includes(q))
    })
  }, [productGroups, filterCat, search])

  const subtotal = useMemo(() => cart.reduce((s, it) => s + computeItemSubtotal(it), 0), [cart])
  const totalDiscount =
    discountType === 'percent' ? subtotal * (discount / 100) : discount
  const total = Math.max(0, subtotal - totalDiscount)

  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments])
  const cashPaid = useMemo(
    () => payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0),
    [payments],
  )
  const nonCashPaid = totalPaid - cashPaid
  const sisa = Math.max(0, total - totalPaid)
  const kembalian = Math.max(0, cashPaid - Math.max(0, total - nonCashPaid))

  const onProductTap = useCallback(
    (p: ProductUi) => {
      if (p.modifierGroupIds.length === 0) {
        addToCart(p, [], 1)
        return
      }
      setPickProduct(p)
      const selections: Record<string, ModifierOptionUi[]> = {}
      for (const gid of p.modifierGroupIds) selections[gid] = []
      setPickSelections(selections)
      setPickQuantity(1)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart],
  )

  const onGroupTap = useCallback(
    (g: ProductGroupUi) => {
      if (g.variants.length === 1) {
        const v = g.variants[0]
        if (v.stockTrack && v.stockCurrent <= 0) {
          toast.error('Stok habis')
          return
        }
        onProductTap(variantToProduct(g, v))
        return
      }
      setVariantPickerGroup(g)
    },
    [onProductTap],
  )

  function addToCart(p: ProductUi, modifiers: CartModifier[], qty: number) {
    const modifierTotal = modifiers.reduce(
      (s, m) => s + m.options.reduce((ss, o) => ss + o.priceAdd, 0),
      0,
    )
    const existing = cart.find(
      (c) =>
        c.productId === p.id &&
        JSON.stringify(c.modifiers) === JSON.stringify(modifiers) &&
        c.priceUnit === p.priceSell,
    )
    if (existing) {
      setCart(
        cart.map((c) => (c.uid === existing.uid ? { ...c, quantity: c.quantity + qty } : c)),
      )
    } else {
      setCart([
        ...cart,
        {
          uid: uidGen(),
          productId: p.id,
          name: p.name,
          priceUnit: p.priceSell,
          originalPrice: p.priceSell,
          quantity: qty,
          modifiers,
          modifierTotal,
          discount: 0,
          discountType: 'amount',
        },
      ])
    }
  }

  const confirmPick = () => {
    if (!pickProduct) return
    const groups = pickProduct.modifierGroupIds
      .map((id) => modifierGroups.find((g) => g.id === id))
      .filter(Boolean) as ModifierGroupUi[]
    for (const g of groups) {
      const sel = pickSelections[g.id] ?? []
      if (g.isRequired && sel.length < Math.max(1, g.minSelect)) {
        toast.error(`Wajib pilih opsi di "${g.name}"`)
        return
      }
      if (sel.length > g.maxSelect) {
        toast.error(`Maks ${g.maxSelect} opsi di "${g.name}"`)
        return
      }
    }
    const modifiers: CartModifier[] = groups.map((g) => ({
      groupId: g.id,
      name: g.name,
      options: (pickSelections[g.id] ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        priceAdd: o.priceAdd,
      })),
    }))
    addToCart(pickProduct, modifiers, pickQuantity)
    setPickProduct(null)
  }

  const updateCartItem = (uid: string, patch: Partial<CartItem>) =>
    setCart(cart.map((c) => (c.uid === uid ? { ...c, ...patch } : c)))

  const incItem = (uid: string) => {
    const c = cart.find((x) => x.uid === uid)
    if (!c) return
    updateCartItem(uid, { quantity: c.quantity + 1 })
  }
  const decItem = (uid: string) => {
    const c = cart.find((x) => x.uid === uid)
    if (!c) return
    if (c.quantity <= 1) {
      setCart(cart.filter((x) => x.uid !== uid))
      return
    }
    updateCartItem(uid, { quantity: c.quantity - 1 })
  }
  const removeItem = (uid: string) => setCart(cart.filter((c) => c.uid !== uid))

  // Barcode scanner detection
  useEffect(() => {
    let buffer = ''
    let lastKey = 0
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return
      }
      const now = Date.now()
      if (now - lastKey > 100) buffer = ''
      lastKey = now
      if (e.key === 'Enter' && buffer.length >= 4) {
        const code = buffer
        buffer = ''
        e.preventDefault()
        ;(async () => {
          const res = await fetch(`/api/products/by-barcode?barcode=${encodeURIComponent(code)}`)
          if (!res.ok) {
            toast.error(`Barcode "${code}" tidak ditemukan`)
            return
          }
          const j = await res.json()
          const p = products.find((pp) => pp.id === j.id)
          if (!p) {
            toast.error('Produk tidak aktif di katalog')
            return
          }
          onProductTap(p)
        })()
      } else if (/^[0-9a-zA-Z-]$/.test(e.key)) {
        buffer += e.key
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [products, onProductTap])

  const openPayment = useCallback(() => {
    if (cart.length === 0) {
      toast.info('Keranjang kosong')
      return
    }
    setPayments([{ uid: uidGen(), method: 'cash', amount: total }])
    setPaymentOpen(true)
  }, [cart.length, total])

  const openHoldDialog = useCallback(() => {
    if (cart.length === 0) {
      toast.info('Keranjang kosong')
      return
    }
    setHoldLabel(
      customerName.trim() ||
        `Tagihan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
    )
    setHoldOpen(true)
  }, [cart.length, customerName])

  const printReceipt = useCallback((trxId: string) => {
    if (typeof window === 'undefined') return
    // In the APK: print over Bluetooth. In a browser: open the print page (unchanged).
    void printTransaction(trxId, () => {
      window.open(`/print/receipt/${trxId}`, '_blank', 'width=480,height=720')
    }).catch((e) => toast.error(e instanceof Error ? e.message : 'Gagal cetak'))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (e.key === 'F1') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'F2') {
        e.preventDefault()
        if (!inField) openPayment()
      } else if (e.key === 'F3') {
        e.preventDefault()
        if (!inField) openHoldDialog()
      } else if (e.key === 'F4') {
        e.preventDefault()
        setHeldOpen(true)
      } else if (e.key === 'F9') {
        e.preventDefault()
        if (successTrx) printReceipt(successTrx.id)
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [openPayment, openHoldDialog, successTrx, printReceipt])

  const searchCustomer = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCustomerHits([])
      return
    }
    const res = await fetch(`/api/customers/quick-search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return
    const j = await res.json()
    setCustomerHits(j.data ?? [])
  }, [])

  const submitHold = async () => {
    if (!shiftId || !cashierId) return
    const label = holdLabel.trim() || `Tagihan ${new Date().toLocaleTimeString('id-ID')}`
    const itemCount = cart.reduce((s, c) => s + c.quantity, 0)
    const res = await fetch('/api/held-carts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        label,
        shiftId,
        cashierId,
        customerId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        cartData: { items: cart, discount, discountType },
        subtotal: Math.round(subtotal),
        itemCount,
      }),
    })
    if (!res.ok) {
      toast.error('Gagal simpan tagihan')
      return
    }
    toast.success(`Tagihan tersimpan: ${label}`)
    setCart([])
    setDiscount(0)
    setDiscountType('amount')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerId(null)
    setActiveHeldCartId(null)
    setHoldOpen(false)
    loadHeld()
  }

  const resumeHeld = async (h: HeldCart) => {
    if (cart.length > 0 && !confirm('Cart sekarang akan diganti. Lanjutkan?')) return
    setCart(h.cartData?.items ?? [])
    setDiscount(h.cartData?.discount ?? 0)
    setDiscountType(h.cartData?.discountType ?? 'amount')
    setCustomerName(h.customerName ?? '')
    setCustomerPhone(h.customerPhone ?? '')
    setCustomerId(h.customerId)
    setActiveHeldCartId(h.id)
    setHeldOpen(false)
    router.refresh()
    toast.success(`Resume: ${h.label}`)
  }

  const deleteHeld = async (h: HeldCart) => {
    if (!confirm(`Hapus tagihan "${h.label}"?`)) return
    await fetch(`/api/held-carts/${h.id}`, { method: 'DELETE' })
    loadHeld()
  }

  const addPayment = () => {
    if (payments.length >= 4) return
    setPayments([...payments, { uid: uidGen(), method: 'cash', amount: Math.max(0, sisa) }])
  }
  const removePayment = (uidp: string) => {
    if (payments.length <= 1) return
    setPayments(payments.filter((p) => p.uid !== uidp))
  }
  const updatePayment = (uidp: string, patch: Partial<Payment>) =>
    setPayments(payments.map((p) => (p.uid === uidp ? { ...p, ...patch } : p)))

  const pickCustomer = (h: CustomerHit) => {
    setCustomerId(h.id)
    setCustomerName(h.name)
    setCustomerPhone(h.phone ?? '')
    setCustomerHits([])
  }

  const submitPayment = async () => {
    if (!shiftId || !cashierId) return
    if (totalPaid < total - 0.5) return toast.error('Total bayar kurang dari tagihan')
    const hasDebt = payments.some(
      (p) => paymentMethodsOpts.find((m) => m.code === p.method)?.type === 'debt',
    )
    if (hasDebt && !customerId && !(customerName.trim() || customerPhone.trim())) {
      return toast.error('Metode Hutang butuh nama atau HP pelanggan.')
    }

    const itemsPayload = cart.map((c) => ({
      productId: c.productId,
      productName: c.name,
      priceUnit: c.priceUnit,
      quantity: c.quantity,
      modifiers: c.modifiers,
      modifierTotal: c.modifierTotal,
      discount: c.discount,
      discountType: c.discountType,
      subtotal: computeItemSubtotal(c),
      notes: c.notes ?? null,
    }))

    setSubmitting(true)
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shiftId,
        cashierId,
        items: itemsPayload,
        subtotal,
        discount: totalDiscount,
        discountType,
        tax: 0,
        total,
        payments: payments.map((p) => ({ method: p.method, amount: p.amount })),
        customerId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        heldCartId: activeHeldCartId,
        pickupStatus: pickupPending ? 'pickup_pending' : 'pickup_immediate',
        pickupNotes: pickupPending ? pickupNotes.trim() || null : null,
        notes: paymentNotes.trim() || null,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Gagal simpan transaksi')
      return
    }
    const j = await res.json()
    setSuccessTrx({ id: j.id, trxNumber: j.trxNumber, total, change: kembalian })
    setPaymentOpen(false)
    setCart([])
    setDiscount(0)
    setDiscountType('amount')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerId(null)
    setActiveHeldCartId(null)
    setPaymentNotes('')
    setPickupPending(false)
    setPickupNotes('')
    loadHeld()
    if (autoPrint) printReceipt(j.id)
  }

  const openDetailItem = (it: CartItem) => {
    setDetailItem({ ...it })
    setOverrideUnlocked(false)
    setOverridePrice(it.priceUnit)
  }
  const saveDetailItem = () => {
    if (!detailItem) return
    updateCartItem(detailItem.uid, {
      quantity: detailItem.quantity,
      discount: detailItem.discount,
      discountType: detailItem.discountType,
      priceUnit: detailItem.priceUnit,
      notes: detailItem.notes,
    })
    setDetailItem(null)
  }

  const requestPriceOverride = () => {
    setOverridePin('')
    setOverridePinOpen(true)
  }
  const verifyOverridePin = async () => {
    if (!detailItem) return
    if (!/^\d{6}$/.test(overridePin)) return toast.error('PIN harus 6 digit')
    setOverrideSubmitting(true)
    const res = await fetch('/api/price-overrides/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pin: overridePin,
        productId: detailItem.productId,
        originalPrice: Math.round(detailItem.originalPrice),
        newPrice: Math.round(overridePrice),
      }),
    })
    setOverrideSubmitting(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(j.error ?? 'PIN salah')
      return
    }
    setDetailItem({ ...detailItem, priceUnit: Math.round(overridePrice) })
    setOverrideUnlocked(true)
    setOverridePinOpen(false)
    toast.success('Harga di-override')
  }

  if (!shiftId) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Mengarahkan ke buka shift…
      </div>
    )
  }

  const totalItemCount = cart.reduce((s, it) => s + it.quantity, 0)

  return (
    <div className="h-full">
      <div className="flex flex-col lg:flex-row h-[calc(100dvh-56px)] lg:h-screen bg-background">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:border-r border-border pb-[68px] lg:pb-0">
          <div className="border-b border-border bg-card px-3 py-2.5 flex gap-2 items-center">
            <Link
              href="/dashboard"
              className="hidden lg:inline-flex rounded-lg p-2 hover:bg-muted"
              aria-label="Kembali"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari atau scan barcode"
                className="pl-9 h-11"
              />
            </div>
            <button
              type="button"
              onClick={() => searchRef.current?.focus()}
              aria-label="Scan barcode"
              className="inline-flex items-center justify-center size-11 shrink-0 rounded-lg border border-border bg-card hover:bg-muted"
              title="Scan barcode (F1)"
            >
              <ScanLine className="size-5" />
            </button>
            <span
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-xs font-semibold"
              title="Scanner ready"
            >
              <Wifi className="size-3" /> Scanner
            </span>
            <button
              onClick={() => setHeldOpen(true)}
              className="hidden md:inline-flex relative items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
              title="Tagihan tersimpan (F4)"
            >
              <Bookmark className="size-4" />
              Tagihan
              {heldCarts.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {heldCarts.length}
                </span>
              )}
            </button>
          </div>

          <div className="border-b border-border bg-card px-3 py-2 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <CategoryChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>
                Semua
              </CategoryChip>
              {categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={filterCat === c.id}
                  onClick={() => setFilterCat(c.id)}
                >
                  {c.name}
                </CategoryChip>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-muted/30">
            {filteredGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                {productGroups.length === 0
                  ? 'Belum ada produk. Tambah di menu Produk.'
                  : 'Tidak ada produk yang cocok.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredGroups.map((g) => {
                  const activeVariants = g.variants.filter((v) => !v.stockTrack || v.stockCurrent > 0)
                  const allOut = activeVariants.length === 0
                  const prices = g.variants.map((v) => v.priceSell)
                  const minPrice = prices.length ? Math.min(...prices) : 0
                  const hasManyVariants = g.variants.length > 1
                  const singleVariant = g.variants.length === 1 ? g.variants[0] : null
                  return (
                    <button
                      key={g.id}
                      onClick={() => onGroupTap(g)}
                      disabled={allOut}
                      className={`text-left bg-card rounded-xl border p-3 transition-all min-h-[100px] flex flex-col justify-between ${
                        allOut
                          ? 'border-border opacity-50 cursor-not-allowed'
                          : 'border-border hover:border-primary hover:shadow-md'
                      }`}
                    >
                      <div className="font-semibold text-sm leading-tight">{g.name}</div>
                      <div className="mt-2">
                        <div className="text-sm font-bold text-primary tabular-nums">
                          {formatRupiah(minPrice)}
                          {hasManyVariants && <span className="text-muted-foreground font-medium">+</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                          {hasManyVariants ? (
                            <span>{g.variants.length} variant</span>
                          ) : singleVariant ? (
                            <>
                              <span>{singleVariant.unit}</span>
                              {singleVariant.stockTrack && (
                                <>
                                  <span className="size-1 rounded-full bg-border" />
                                  <span
                                    className={
                                      singleVariant.stockCurrent <= 0
                                        ? 'text-destructive font-bold'
                                        : singleVariant.stockCurrent < 5
                                        ? 'text-warning font-bold'
                                        : ''
                                    }
                                  >
                                    {singleVariant.stockCurrent <= 0
                                      ? 'Habis'
                                      : `Stok ${singleVariant.stockCurrent}`}
                                  </span>
                                </>
                              )}
                            </>
                          ) : null}
                          {allOut && (
                            <span className="text-destructive font-bold">Habis</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile/tablet slide-up backdrop. Tap to close. */}
        <button
          aria-label="Tutup keranjang"
          onClick={() => setCartDrawerOpen(false)}
          className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
            cartDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        <aside
          className={`flex flex-col bg-card border-border z-50
            lg:static lg:flex lg:w-[360px] xl:w-[420px] lg:shrink-0 lg:translate-y-0 lg:border-l-0 lg:rounded-none lg:max-h-none
            fixed inset-x-0 bottom-0 top-[10%] rounded-t-2xl shadow-2xl
            transition-transform duration-200 ease-out
            ${cartDrawerOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
        >
          {/* Drag-handle hint — mobile/tablet only */}
          <div className="lg:hidden pt-2 pb-1 flex justify-center">
            <span className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setCartDrawerOpen(false)}
                aria-label="Tutup"
                className="lg:hidden inline-flex items-center justify-center size-9 -ml-1 rounded-md hover:bg-muted"
              >
                <X className="size-5" />
              </button>
              <ShoppingBag className="size-4 text-primary shrink-0" />
              <div className="font-bold text-sm">
                Keranjang{totalItemCount > 0 ? ` (${totalItemCount})` : ''}
              </div>
            </div>
            <button
              onClick={() => setHeldOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap"
              title="Tagihan tersimpan (F4)"
            >
              <Bookmark className="size-3.5" />
              Tagihan
              {heldCarts.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {heldCarts.length}
                </span>
              )}
            </button>
          </div>
          <div className="border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="font-semibold">{cashierName || 'Kasir'}</span>
              {openedAt && (
                <span className="text-muted-foreground ml-1.5">
                  · {new Date(openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <Link href="/kasir/tutup-shift" className="shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Lock className="size-3.5" />
                Tutup Shift
              </Button>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ShoppingBag className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Keranjang kosong</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Tap produk atau scan barcode.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((it) => {
                  const sub = computeItemSubtotal(it)
                  const gross = (it.priceUnit + it.modifierTotal) * it.quantity
                  return (
                    <li
                      key={it.uid}
                      className="p-3 hover:bg-muted/30 cursor-pointer"
                      onClick={() => openDetailItem(it)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm leading-tight">{it.name}</div>
                          {it.modifiers.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {it.modifiers
                                .map((m) => m.options.map((o) => o.name).join(', '))
                                .filter(Boolean)
                                .join(' • ')}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                            <span>
                              {formatRupiah(it.priceUnit + it.modifierTotal)} × {it.quantity}
                            </span>
                            {it.priceUnit !== it.originalPrice && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-warning/10 text-warning px-1.5 py-0.5 text-[10px] font-semibold">
                                <Lock className="size-2.5" /> Override
                              </span>
                            )}
                            {it.discount > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px] font-semibold">
                                <Tag className="size-2.5" />
                                {it.discountType === 'percent'
                                  ? `-${it.discount}%`
                                  : `-${formatRupiah(it.discount)}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeItem(it.uid)
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                          aria-label="Hapus"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div
                        className="mt-2 flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1 rounded-lg border border-border">
                          <button
                            onClick={() => decItem(it.uid)}
                            className="inline-flex items-center justify-center size-9 hover:bg-muted rounded-l-lg"
                            aria-label="Kurangi"
                          >
                            <Minus className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setQtyPad({ uid: it.uid, name: it.name, value: it.quantity })
                            }}
                            className="min-w-[44px] h-9 px-1 text-center font-semibold text-sm tabular-nums rounded hover:bg-muted/40"
                            aria-label="Ubah jumlah"
                          >
                            {it.quantity}
                          </button>
                          <button
                            onClick={() => incItem(it.uid)}
                            className="inline-flex items-center justify-center size-9 hover:bg-muted rounded-r-lg"
                            aria-label="Tambah"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <div className="ml-auto text-right">
                          {sub !== gross && (
                            <div className="text-[10px] text-muted-foreground line-through tabular-nums">
                              {formatRupiah(gross)}
                            </div>
                          )}
                          <div className="text-sm font-bold tabular-nums">{formatRupiah(sub)}</div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm text-muted-foreground">Diskon</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDiscountType('amount')}
                  className={`text-xs px-2 py-1 rounded ${
                    discountType === 'amount' ? 'bg-foreground text-background' : 'bg-muted'
                  }`}
                >
                  Rp
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percent')}
                  className={`text-xs px-2 py-1 rounded ${
                    discountType === 'percent' ? 'bg-foreground text-background' : 'bg-muted'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountPadOpen(true)}
                  className="min-w-[88px] h-8 px-3 rounded-md border border-border text-right text-sm font-semibold tabular-nums hover:bg-muted/40"
                  aria-label="Ubah diskon"
                >
                  {discount}
                </button>
              </div>
            </div>
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-xs text-destructive">
                <span>Diskon</span>
                <span className="tabular-nums">- {formatRupiah(totalDiscount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-base font-bold">Total</span>
              <span className="text-2xl font-extrabold tabular-nums text-primary">
                {formatRupiah(total)}
              </span>
            </div>
            <Button
              onClick={openPayment}
              size="lg"
              disabled={cart.length === 0}
              className="w-full h-12 text-base font-bold gap-2 shadow-lg shadow-primary/25"
              title="F2"
            >
              <CreditCard className="size-4" />
              Bayar
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={openHoldDialog} className="gap-2 font-semibold" title="F3">
                <Bookmark className="size-4" /> Simpan
              </Button>
              <Button variant="outline" onClick={() => setHeldOpen(true)} className="gap-2 font-semibold">
                <Bookmark className="size-4" /> Tagihan
                {heldCarts.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {heldCarts.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile/tablet mini cart dock — sticky bottom, dark. Always visible so
            held carts stay reachable even when the cart is empty. */}
        <div
          className={`lg:hidden fixed inset-x-3 bottom-3 z-30 transition-opacity duration-200 ${
            cartDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {cart.length > 0 ? (
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#292524] text-white px-3.5 py-3 shadow-xl"
              aria-label="Buka keranjang"
            >
              <span className="relative inline-flex items-center justify-center size-9 rounded-xl bg-white/10">
                <ShoppingCart className="size-4" />
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[#292524] text-[10px] font-bold">
                  {totalItemCount}
                </span>
              </span>
              <span className="flex-1 text-left min-w-0">
                <span className="block text-[11px] text-white/70 leading-tight">
                  {totalItemCount} item · Total
                </span>
                <span className="block text-base font-semibold tabular-nums leading-tight truncate">
                  {formatRupiah(total)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-primary text-[#292524] px-3 py-2 text-sm font-bold">
                Bayar <ChevronRight className="size-4" />
              </span>
            </button>
          ) : (
            <div className="flex w-full items-center gap-3 rounded-2xl bg-[#292524] text-white px-3.5 py-3 shadow-xl">
              <span className="inline-flex items-center justify-center size-9 rounded-xl bg-white/10">
                <ShoppingCart className="size-4 text-white/70" />
              </span>
              <span className="flex-1 text-left min-w-0">
                <span className="block text-[11px] text-white/70 leading-tight">
                  Keranjang kosong
                </span>
                <span className="block text-sm font-medium leading-tight truncate">
                  Pilih produk untuk mulai
                </span>
              </span>
              <button
                type="button"
                onClick={() => setHeldOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold"
                aria-label="Tagihan tersimpan"
              >
                <Bookmark className="size-4" /> Tersimpan
                {heldCarts.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[#292524] text-[10px] font-bold">
                    {heldCarts.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Number pad popups (custom — no Android keyboard) */}
      {qtyPad && (
        <NumberPadPopup
          open={!!qtyPad}
          title={qtyPad.name}
          label="Jumlah"
          min={1}
          initialValue={qtyPad.value}
          onSubmit={(n) => updateCartItem(qtyPad.uid, { quantity: n })}
          onClose={() => setQtyPad(null)}
        />
      )}
      <NumberPadPopup
        open={discountPadOpen}
        title="Diskon"
        label={discountType === 'percent' ? 'Diskon (%)' : 'Diskon (Rp)'}
        min={0}
        max={discountType === 'percent' ? 100 : undefined}
        initialValue={discount}
        onSubmit={(n) => setDiscount(n)}
        onClose={() => setDiscountPadOpen(false)}
      />
      {detailItem && (
        <NumberPadPopup
          open={detailQtyPadOpen}
          title={detailItem.name}
          label="Jumlah"
          min={1}
          initialValue={detailItem.quantity}
          onSubmit={(n) => setDetailItem({ ...detailItem, quantity: n })}
          onClose={() => setDetailQtyPadOpen(false)}
        />
      )}

      {/* Modifier picker */}
      <Dialog open={!!pickProduct} onOpenChange={(o) => !o && setPickProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {pickProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{pickProduct.name}</DialogTitle>
                <DialogDescription>
                  {formatRupiah(pickProduct.priceSell)} / {pickProduct.unit}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {pickProduct.modifierGroupIds.map((gid) => {
                  const g = modifierGroups.find((gg) => gg.id === gid)
                  if (!g) return null
                  return (
                    <div key={g.id}>
                      <Label className="font-semibold">
                        {g.name} {g.isRequired && <span className="text-destructive">*</span>}
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {g.type === 'single' ? 'Pilih 1' : `Pilih ${g.minSelect || 1}-${g.maxSelect}`}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {g.options.map((o) => {
                          const selected = (pickSelections[g.id] ?? []).find((x) => x.id === o.id)
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => {
                                const cur = pickSelections[g.id] ?? []
                                if (g.type === 'single') {
                                  setPickSelections({ ...pickSelections, [g.id]: [o] })
                                } else {
                                  const exists = cur.find((x) => x.id === o.id)
                                  setPickSelections({
                                    ...pickSelections,
                                    [g.id]: exists ? cur.filter((x) => x.id !== o.id) : [...cur, o],
                                  })
                                }
                              }}
                              className={`text-left rounded-lg border p-3 transition-all ${
                                selected
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:bg-muted/50'
                              }`}
                            >
                              <div className="text-sm font-semibold">{o.name}</div>
                              {o.priceAdd > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  +{formatRupiah(o.priceAdd)}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <Label>Qty</Label>
                  <div className="flex items-center gap-1 rounded-lg border border-border">
                    <button
                      onClick={() => setPickQuantity(Math.max(1, pickQuantity - 1))}
                      className="p-2 hover:bg-muted rounded-l-lg"
                    >
                      <Minus className="size-4" />
                    </button>
                    <div className="w-12 text-center font-semibold">{pickQuantity}</div>
                    <button
                      onClick={() => setPickQuantity(pickQuantity + 1)}
                      className="p-2 hover:bg-muted rounded-r-lg"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <Button onClick={confirmPick} className="w-full h-11 font-semibold">
                  Tambahkan
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Variant picker */}
      <Dialog
        open={!!variantPickerGroup}
        onOpenChange={(o) => !o && setVariantPickerGroup(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {variantPickerGroup && (
            <>
              <DialogHeader>
                <DialogTitle>Pilih Variant: {variantPickerGroup.name}</DialogTitle>
                <DialogDescription>
                  {variantPickerGroup.variants.length} variant tersedia
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {variantPickerGroup.variants.map((v) => {
                  const out = v.stockTrack && v.stockCurrent <= 0
                  const low = v.stockTrack && v.stockCurrent > 0 && v.stockCurrent < 5
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={out}
                      onClick={() => {
                        if (!variantPickerGroup) return
                        onProductTap(variantToProduct(variantPickerGroup, v))
                        setVariantPickerGroup(null)
                      }}
                      className={`min-h-[80px] text-left rounded-xl border p-3 transition-all ${
                        out
                          ? 'border-border opacity-50 cursor-not-allowed'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      <div className="font-semibold text-sm leading-tight">
                        {v.variantName || 'Default'}
                      </div>
                      <div className="mt-1.5 text-sm font-bold text-primary tabular-nums">
                        {formatRupiah(v.priceSell)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                        <span>{v.unit}</span>
                        {v.stockTrack && (
                          <>
                            <span className="size-1 rounded-full bg-border" />
                            <span
                              className={
                                out
                                  ? 'text-destructive font-bold'
                                  : low
                                  ? 'text-warning font-bold'
                                  : ''
                              }
                            >
                              {out ? 'Habis' : low ? `Sisa ${v.stockCurrent}` : `Stok ${v.stockCurrent}`}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => setVariantPickerGroup(null)}
                className="w-full"
              >
                Batal
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Item modal */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-md">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>Detail Item</DialogTitle>
                <DialogDescription>{detailItem.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Qty</Label>
                  <div className="flex items-center gap-1 rounded-lg border border-border">
                    <button
                      onClick={() =>
                        setDetailItem({ ...detailItem, quantity: Math.max(1, detailItem.quantity - 1) })
                      }
                      className="p-2 hover:bg-muted rounded-l-lg"
                    >
                      <Minus className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailQtyPadOpen(true)}
                      className="w-12 h-9 text-center font-semibold tabular-nums rounded hover:bg-muted/40"
                      aria-label="Ubah jumlah"
                    >
                      {detailItem.quantity}
                    </button>
                    <button
                      onClick={() => setDetailItem({ ...detailItem, quantity: detailItem.quantity + 1 })}
                      className="p-2 hover:bg-muted rounded-r-lg"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Harga Satuan</Label>
                    {!overrideUnlocked ? (
                      <button
                        type="button"
                        onClick={requestPriceOverride}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-warning hover:underline"
                      >
                        <Lock className="size-3" /> Ubah Harga
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <Lock className="size-3" /> Unlocked
                      </span>
                    )}
                  </div>
                  <CurrencyInput
                    value={overrideUnlocked ? overridePrice : detailItem.priceUnit}
                    onValueChange={(n) => {
                      if (overrideUnlocked) {
                        setOverridePrice(n)
                        setDetailItem({ ...detailItem, priceUnit: n })
                      }
                    }}
                    disabled={!overrideUnlocked}
                  />
                  {detailItem.priceUnit !== detailItem.originalPrice && (
                    <p className="text-xs text-warning">
                      Original: {formatRupiah(detailItem.originalPrice)} → diubah
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Diskon Per Item</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailItem({ ...detailItem, discountType: 'amount' })}
                      className={`text-xs px-2.5 py-1.5 rounded font-semibold ${
                        detailItem.discountType === 'amount'
                          ? 'bg-foreground text-background'
                          : 'bg-muted'
                      }`}
                    >
                      Rp
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailItem({ ...detailItem, discountType: 'percent' })}
                      className={`text-xs px-2.5 py-1.5 rounded font-semibold ${
                        detailItem.discountType === 'percent'
                          ? 'bg-foreground text-background'
                          : 'bg-muted'
                      }`}
                    >
                      %
                    </button>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={detailItem.discount}
                      onChange={(e) =>
                        setDetailItem({
                          ...detailItem,
                          discount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="flex-1"
                      min={0}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="di-notes">Catatan</Label>
                  <Textarea
                    id="di-notes"
                    value={detailItem.notes ?? ''}
                    onChange={(e) => setDetailItem({ ...detailItem, notes: e.target.value })}
                    rows={2}
                    placeholder="Catatan untuk dapur / pelanggan"
                  />
                </div>

                <div className="rounded-lg bg-muted p-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal item</span>
                  <span className="font-bold tabular-nums">
                    {formatRupiah(computeItemSubtotal(detailItem))}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      removeItem(detailItem.uid)
                      setDetailItem(null)
                    }}
                    className="flex-1 gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" /> Hapus
                  </Button>
                  <Button onClick={saveDetailItem} className="flex-1 font-semibold gap-2">
                    <Edit3 className="size-4" /> Simpan
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Price override PIN */}
      <Dialog open={overridePinOpen} onOpenChange={setOverridePinOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Override Harga</DialogTitle>
            <DialogDescription>Butuh PIN manager untuk mengubah harga jual.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ov-pin">PIN Manager</Label>
              <Input
                id="ov-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={overridePin}
                onChange={(e) => setOverridePin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-[0.5em] h-12"
                placeholder="••••••"
                autoFocus
              />
            </div>
            <Button
              onClick={verifyOverridePin}
              disabled={overrideSubmitting}
              className="w-full h-11 font-semibold gap-2"
            >
              {overrideSubmitting && <Loader2 className="size-4 animate-spin" />}
              Verifikasi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hold dialog */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Simpan Tagihan</DialogTitle>
            <DialogDescription>Simpan keranjang untuk dilanjutkan nanti.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="hl">Label Tagihan</Label>
              <Input
                id="hl"
                value={holdLabel}
                onChange={(e) => setHoldLabel(e.target.value)}
                placeholder="cth. Pak Asep"
                autoFocus
              />
            </div>
            <Button onClick={submitHold} className="w-full h-11 font-semibold">
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Held carts list */}
      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tagihan Tersimpan</DialogTitle>
            <DialogDescription>{heldCarts.length} tagihan menunggu</DialogDescription>
          </DialogHeader>
          {heldCarts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada tagihan tersimpan.
            </div>
          ) : (
            <ul className="space-y-2">
              {heldCarts.map((h) => (
                <li key={h.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{h.label}</div>
                      {h.customerName && (
                        <div className="text-xs text-muted-foreground">
                          {h.customerName} {h.customerPhone && `• ${h.customerPhone}`}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{h.itemCount} item</span>
                        <span className="size-1 rounded-full bg-border" />
                        <span className="font-semibold">{formatRupiah(h.subtotal)}</span>
                        <span className="size-1 rounded-full bg-border" />
                        <span>
                          {new Date(h.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2.5">
                    <Button size="sm" onClick={() => resumeHeld(h)} className="flex-1 gap-1.5">
                      Resume <ChevronRight className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteHeld(h)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bayar Transaksi</DialogTitle>
            <DialogDescription className="text-2xl font-extrabold text-primary tabular-nums">
              {formatRupiah(total)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Metode Pembayaran
                </div>
                <button
                  type="button"
                  onClick={addPayment}
                  disabled={payments.length >= 4}
                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  + Split
                </button>
              </div>

              {payments.map((p, idx) => {
                const customerHasInfo =
                  !!customerId || !!customerName.trim() || !!customerPhone.trim()
                const opt = paymentMethodsOpts.find((m) => m.code === p.method)
                const isCash = opt?.type === 'cash'
                const isDebtMethod = opt?.type === 'debt'
                const nonCashSum = payments
                  .filter((x, i) => i !== idx && paymentMethodsOpts.find((m) => m.code === x.method)?.type !== 'cash')
                  .reduce((s, x) => s + x.amount, 0)
                const otherCashSum = payments
                  .filter((x, i) => i !== idx && paymentMethodsOpts.find((m) => m.code === x.method)?.type === 'cash')
                  .reduce((s, x) => s + x.amount, 0)
                const cashRequired = isCash
                  ? Math.max(0, total - nonCashSum - otherCashSum)
                  : 0
                const quick = isCash ? generateQuickAmounts(cashRequired) : []
                return (
                  <div key={p.uid} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={p.method}
                        onValueChange={(v) =>
                          updatePayment(p.uid, { method: (v ?? 'cash') as Payment['method'] })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethodsOpts.map((m) => (
                            <SelectItem
                              key={m.code}
                              value={m.code}
                              disabled={m.type === 'debt' && !customerHasInfo}
                            >
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <CurrencyInput
                        value={p.amount}
                        onValueChange={(n) => updatePayment(p.uid, { amount: n })}
                        className="flex-1"
                      />
                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePayment(p.uid)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Hapus metode"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                    {isCash && cashRequired > 0 && (
                      <QuickAmountGrid
                        amounts={quick}
                        value={p.amount}
                        onPick={(n) => updatePayment(p.uid, { amount: n })}
                      />
                    )}
                    {isDebtMethod && !customerHasInfo && (
                      <p className="text-xs text-destructive">
                        Isi nama atau HP pelanggan untuk metode Hutang.
                      </p>
                    )}
                  </div>
                )
              })}

              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-semibold tabular-nums">{formatRupiah(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Bayar</span>
                  <span className="font-semibold tabular-nums">{formatRupiah(totalPaid)}</span>
                </div>
                {sisa > 0 ? (
                  <div className="flex items-center justify-between text-destructive font-semibold">
                    <span>Sisa</span>
                    <span className="tabular-nums">{formatRupiah(sisa)}</span>
                  </div>
                ) : kembalian > 0 ? (
                  <div className="flex items-center justify-between text-success font-semibold">
                    <span>Kembalian</span>
                    <span className="tabular-nums">{formatRupiah(kembalian)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pengambilan Barang
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickupPending(false)}
                  className={`flex-1 h-10 rounded-md text-sm font-semibold transition-colors ${
                    !pickupPending
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Diambil sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setPickupPending(true)}
                  className={`flex-1 h-10 rounded-md text-sm font-semibold transition-colors ${
                    pickupPending
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Titip dulu
                </button>
              </div>
              {pickupPending && (
                <Input
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="Catatan pickup (opsional)"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Catatan</Label>
              <Textarea
                id="pay-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                placeholder="Opsional"
              />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pelanggan (Opsional)
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Nama</Label>
                <div className="relative">
                  <Input
                    id="cust-name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value)
                      setCustomerId(null)
                      searchCustomer(e.target.value)
                    }}
                    placeholder="Nama pelanggan"
                  />
                  {customerHits.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-md max-h-48 overflow-auto">
                      {customerHits.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => pickCustomer(h)}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-semibold">{h.name}</div>
                              {h.phone && (
                                <div className="text-xs text-muted-foreground">{h.phone}</div>
                              )}
                            </div>
                            {h.totalDebt > 0 && (
                              <span className="text-xs font-semibold text-destructive">
                                Hutang {formatRupiah(h.totalDebt)}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">HP</Label>
                <Input
                  id="cust-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0812xxxxxxx"
                  inputMode="tel"
                />
              </div>
              {!customerId && (customerName.trim() || customerPhone.trim()) && (
                <p className="text-xs text-muted-foreground">
                  Pelanggan akan otomatis tersimpan kalau nama atau HP diisi.
                </p>
              )}
              {customerId && (
                <p className="text-xs text-success font-semibold flex items-center gap-1">
                  ✓ Pelanggan dipilih dari database
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setPaymentOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button
                onClick={submitPayment}
                disabled={submitting || sisa > 0}
                className="flex-1 h-11 font-semibold gap-2"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Bayar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success */}
      <Dialog open={!!successTrx} onOpenChange={(o) => !o && setSuccessTrx(null)}>
        <DialogContent className="max-w-sm text-center">
          {successTrx && (
            <>
              <div className="mx-auto size-14 rounded-full bg-success/10 text-success flex items-center justify-center mb-3 text-2xl font-bold">
                ✓
              </div>
              <DialogHeader>
                <DialogTitle className="text-center">Transaksi Sukses</DialogTitle>
                <DialogDescription className="text-center">{successTrx.trxNumber}</DialogDescription>
              </DialogHeader>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums">
                {formatRupiah(successTrx.total)}
              </div>
              {successTrx.change > 0 && (
                <div className="text-sm text-success font-semibold">
                  Kembalian {formatRupiah(successTrx.change)}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => printReceipt(successTrx.id)}
                  className="flex-1"
                >
                  Cetak Ulang (F9)
                </Button>
                <Button onClick={() => setSuccessTrx(null)} className="flex-1 font-semibold">
                  Lanjut
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
        active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-border'
      }`}
    >
      {children}
    </button>
  )
}
