"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Search, Plus, Trash2, ArrowLeft, ArrowRight, Check, Loader2, ShoppingBag } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { maskIMEI } from "@/lib/utils/imei"
import { cn } from "@/lib/utils"

/* ─── shared types ─── */
interface AvailablePhone {
  id: string; brand: string; model: string; storage: string
  color: string; imei: string; condition: string; ptaStatus: string | null
  batteryHealth: number | null; costPrice: string
  lot: { id: string; name: string }
}
interface Shop { id: string; name: string; phone: string | null }
interface RecentSale {
  id: string; saleType: string; soldAt: string
  sellingPrice: string; customerName: string | null
  shopBuyer: { name: string } | null
  seller: { name: string }
  phone: { brand: string; model: string; storage: string; costPrice: string }
}
interface PhoneWithPrice { phone: AvailablePhone; sellingPrice: string }

const STATUS_COLORS: Record<string, string> = {
  customer: "bg-purple-100 text-purple-700",
  shop: "bg-blue-100 text-blue-700",
}

/* ─── Phone search result card ─── */
function PhoneSearchCard({
  phone,
  action,
}: {
  phone: AvailablePhone
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-tight">
          {phone.model} · {phone.storage}
        </p>
        <p className="text-xs text-gray-500">{phone.color}{phone.ptaStatus ? ` · ${phone.ptaStatus}` : ""}</p>
        <p className="text-xs font-mono text-gray-400 mt-0.5">{maskIMEI(phone.imei)}</p>
      </div>
      {action}
    </div>
  )
}

/* ─── Inline Add Shop dialog ─── */
function AddShopDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (shop: Shop) => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    })
    if (res.ok) {
      const shop = await res.json()
      onAdded(shop)
      setName(""); setPhone("")
    } else {
      toast.error("Failed to add shop")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add New Shop</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Shop Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Malik Mobile" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Add Shop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Customer Sale (3 steps) ─── */
function CustomerSale() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<AvailablePhone[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<AvailablePhone | null>(null)
  const [sellingPrice, setSellingPrice] = useState("")
  const [amountReceived, setAmountReceived] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [saleNotes, setSaleNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/phones?status=available&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function reset() {
    setStep(1); setSearch(""); setResults([]); setSelected(null)
    setSellingPrice(""); setAmountReceived(""); setCustomerName(""); setSaleNotes("")
  }

  async function handleConfirm() {
    if (!selected || !sellingPrice) return
    setSaving(true)
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleType: "customer",
        phoneId: selected.id,
        customerName: customerName || null,
        sellingPrice: Number(sellingPrice),
        amountReceived: Number(amountReceived) || 0,
        notes: saleNotes || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Sale failed")
    } else {
      toast.success("Sale recorded!")
      reset()
    }
    setSaving(false)
  }

  const profit = selected && sellingPrice
    ? Number(sellingPrice) - Number(selected.costPrice) : null
  const pending = sellingPrice && amountReceived
    ? Number(sellingPrice) - Number(amountReceived) : null

  if (step === 1) return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by IMEI or model name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9 text-base"
          autoFocus
        />
      </div>

      {searching && <p className="text-xs text-gray-400 text-center">Searching...</p>}

      {!search && (
        <p className="text-sm text-gray-400 text-center py-8">
          Type a model name or last 4–6 digits of IMEI
        </p>
      )}

      <div className="space-y-2">
        {results.map((phone) => (
          <PhoneSearchCard
            key={phone.id}
            phone={phone}
            action={
              <Button
                size="sm"
                onClick={() => { setSelected(phone); setStep(2) }}
                className="h-8 flex-shrink-0"
              >
                Select
              </Button>
            }
          />
        ))}
        {search && !searching && results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No available phones match</p>
        )}
      </div>
    </div>
  )

  if (step === 2 && selected) return (
    <div className="space-y-4">
      <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="w-3.5 h-3.5" /> Change phone
      </button>

      <Card className="bg-gray-50 border-0">
        <CardContent className="p-3">
          <p className="font-medium text-gray-900 text-sm">{selected.model} · {selected.storage} · {selected.color}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{maskIMEI(selected.imei)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Cost: {formatPKR(Number(selected.costPrice))}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Selling Price (PKR) *</Label>
          <Input
            type="number" min={0}
            placeholder="e.g. 95000"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="h-12 text-base"
          />
          {sellingPrice && profit !== null && (
            <p className={`text-xs font-medium ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
              Profit: {formatPKR(profit)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Amount Received Now (PKR) *</Label>
          <Input
            type="number" min={0}
            placeholder="e.g. 95000 or 0"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            className="h-12 text-base"
          />
          {pending !== null && pending > 0 && (
            <p className="text-xs text-orange-600">Pending: {formatPKR(pending)}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Customer Name <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            placeholder="e.g. Ahmed Khan"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            placeholder="Any notes..."
            value={saleNotes}
            onChange={(e) => setSaleNotes(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <Button
        className="w-full h-12"
        disabled={!sellingPrice || !amountReceived}
        onClick={() => setStep(3)}
      >
        Review Sale <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )

  if (step === 3 && selected) return (
    <div className="space-y-4">
      <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="w-3.5 h-3.5" /> Edit details
      </button>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Sale Summary</p>
          {[
            { label: "Phone", value: `${selected.model} · ${selected.storage}` },
            { label: "Color", value: selected.color },
            { label: "IMEI", value: maskIMEI(selected.imei) },
            { label: "Cost Price", value: formatPKR(Number(selected.costPrice)) },
            { label: "Selling Price", value: formatPKR(Number(sellingPrice)) },
            { label: "Profit", value: profit !== null ? formatPKR(profit) : "—", highlight: profit !== null ? (profit >= 0 ? "green" : "red") : undefined },
            { label: "Received Now", value: formatPKR(Number(amountReceived) || 0) },
            ...(pending && pending > 0 ? [{ label: "Still Pending", value: formatPKR(pending), highlight: "orange" as const }] : []),
            ...(customerName ? [{ label: "Customer", value: customerName }] : []),
          ].map(({ label, value, highlight }) => (
            <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={cn(
                "text-sm font-medium",
                highlight === "green" && "text-green-600",
                highlight === "red" && "text-red-600",
                highlight === "orange" && "text-orange-600",
                !highlight && "text-gray-900"
              )}>{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleConfirm} disabled={saving} className="w-full h-12 text-base font-semibold">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        Confirm Sale
      </Button>
    </div>
  )

  return null
}

/* ─── Shop Sale (4 steps) ─── */
function ShopSale({ shops, onShopAdded }: { shops: Shop[]; onShopAdded: (s: Shop) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [addShopOpen, setAddShopOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<AvailablePhone[]>([])
  const [searching, setSearching] = useState(false)
  const [cart, setCart] = useState<PhoneWithPrice[]>([])
  const [amountReceived, setAmountReceived] = useState("")
  const [saleNotes, setSaleNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/phones?status=available&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      // Exclude already-in-cart phones
      const cartIds = new Set(cart.map((c) => c.phone.id))
      setResults(Array.isArray(data) ? data.filter((p: AvailablePhone) => !cartIds.has(p.id)) : [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search, cart])

  function reset() {
    setStep(1); setSelectedShop(null); setSearch(""); setResults([])
    setCart([]); setAmountReceived(""); setSaleNotes("")
  }

  function addToCart(phone: AvailablePhone) {
    setCart((prev) => [...prev, { phone, sellingPrice: "" }])
    setSearch("")
  }

  function removeFromCart(phoneId: string) {
    setCart((prev) => prev.filter((c) => c.phone.id !== phoneId))
  }

  function updatePrice(phoneId: string, price: string) {
    setCart((prev) => prev.map((c) => c.phone.id === phoneId ? { ...c, sellingPrice: price } : c))
  }

  const totalSelling = cart.reduce((sum, c) => sum + (Number(c.sellingPrice) || 0), 0)
  const totalCost = cart.reduce((sum, c) => sum + Number(c.phone.costPrice), 0)
  const totalProfit = totalSelling - totalCost
  const pending = totalSelling - (Number(amountReceived) || 0)
  const allPricesFilled = cart.length > 0 && cart.every((c) => Number(c.sellingPrice) > 0)

  async function handleConfirm() {
    setSaving(true)
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleType: "shop",
        shopBuyerId: selectedShop!.id,
        phones: cart.map((c) => ({ phoneId: c.phone.id, sellingPrice: Number(c.sellingPrice) })),
        amountReceived: Number(amountReceived) || 0,
        notes: saleNotes || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Sale failed")
    } else {
      toast.success(`Sale recorded — ${cart.length} phone${cart.length !== 1 ? "s" : ""}!`)
      reset()
    }
    setSaving(false)
  }

  if (step === 1) return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Select Shop *</Label>
        <div className="grid gap-2">
          {shops.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSelectedShop(s); setStep(2) }}
              className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 text-left hover:border-gray-400 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                {s.phone && <p className="text-xs text-gray-400 mt-0.5">{s.phone}</p>}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAddShopOpen(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mt-1"
        >
          <Plus className="w-4 h-4" /> Add new shop
        </button>
      </div>

      <AddShopDialog
        open={addShopOpen}
        onClose={() => setAddShopOpen(false)}
        onAdded={(shop) => {
          onShopAdded(shop)
          setSelectedShop(shop)
          setAddShopOpen(false)
          setStep(2)
        }}
      />
    </div>
  )

  if (step === 2) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-medium text-gray-700">{selectedShop?.name}</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search phone to add..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.slice(0, 5).map((phone) => (
            <PhoneSearchCard
              key={phone.id}
              phone={phone}
              action={
                <Button variant="outline" size="sm" onClick={() => addToCart(phone)} className="h-8 flex-shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              }
            />
          ))}
        </div>
      )}

      {searching && <p className="text-xs text-gray-400 text-center">Searching...</p>}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Selected Phones ({cart.length})
          </p>
          {cart.map((item) => (
            <div key={item.phone.id} className="p-3 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {item.phone.model} · {item.phone.storage}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{maskIMEI(item.phone.imei)}</p>
                </div>
                <button onClick={() => removeFromCart(item.phone.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Input
                type="number" min={0}
                placeholder={`Selling price (cost: ${formatPKR(Number(item.phone.costPrice))})`}
                value={item.sellingPrice}
                onChange={(e) => updatePrice(item.phone.id, e.target.value)}
                className="h-10 text-sm"
              />
              {item.sellingPrice && (
                <p className={`text-xs font-medium ${Number(item.sellingPrice) >= Number(item.phone.costPrice) ? "text-green-600" : "text-red-500"}`}>
                  Profit: {formatPKR(Number(item.sellingPrice) - Number(item.phone.costPrice))}
                </p>
              )}
            </div>
          ))}

          {totalSelling > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Total selling</span>
                <span className="font-semibold">{formatPKR(totalSelling)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total profit</span>
                <span className={`font-semibold ${totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatPKR(totalProfit)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {cart.length === 0 && !search && (
        <p className="text-sm text-gray-400 text-center py-4">Search and add phones above</p>
      )}

      <Button
        className="w-full h-12"
        disabled={!allPricesFilled}
        onClick={() => setStep(3)}
      >
        Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )

  if (step === 3) return (
    <div className="space-y-4">
      <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="w-3.5 h-3.5" /> Edit phones
      </button>

      <Card className="bg-gray-50 border-0">
        <CardContent className="p-3 text-sm">
          <p className="font-medium text-gray-900">{selectedShop?.name}</p>
          <p className="text-gray-500 mt-0.5">{cart.length} phones · Total: {formatPKR(totalSelling)}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Amount Received Now (PKR)</Label>
          <Input
            type="number" min={0}
            placeholder="e.g. 0 or partial amount"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            className="h-12 text-base"
          />
          {amountReceived && pending > 0 && (
            <p className="text-xs text-orange-600">Outstanding: {formatPKR(pending)}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            placeholder="Any notes..."
            value={saleNotes}
            onChange={(e) => setSaleNotes(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <Button className="w-full h-12" onClick={() => setStep(4)}>
        Review Sale <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )

  if (step === 4) return (
    <div className="space-y-4">
      <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="w-3.5 h-3.5" /> Edit payment
      </button>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Sale to {selectedShop?.name}
          </p>
          {cart.map((item) => (
            <div key={item.phone.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm text-gray-900">{item.phone.model} · {item.phone.storage}</p>
                <p className="text-xs text-gray-400 font-mono">{maskIMEI(item.phone.imei)}</p>
              </div>
              <span className="text-sm font-medium text-gray-900">{formatPKR(Number(item.sellingPrice))}</span>
            </div>
          ))}
          <div className="pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Selling</span>
              <span className="font-semibold">{formatPKR(totalSelling)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Profit</span>
              <span className={`font-semibold ${totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                {formatPKR(totalProfit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Received Now</span>
              <span className="font-semibold">{formatPKR(Number(amountReceived) || 0)}</span>
            </div>
            {pending > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Outstanding</span>
                <span className="font-semibold text-orange-600">{formatPKR(pending)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleConfirm} disabled={saving} className="w-full h-12 text-base font-semibold">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        Confirm Sale
      </Button>
    </div>
  )

  return null
}

/* ─── Main Page ─── */
export default function SalesPage() {
  const [tab, setTab] = useState<"customer" | "shop">("customer")
  const [shops, setShops] = useState<Shop[]>([])
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    fetch("/api/shops").then(async (r) => (r.ok ? r.json() : [])).then((d) => {
      if (Array.isArray(d)) setShops(d)
    })
    fetch("/api/sales").then(async (r) => (r.ok ? r.json() : [])).then((d) => {
      if (Array.isArray(d)) setRecentSales(d)
      setLoadingRecent(false)
    })
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Record Sale</h1>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
        {(["customer", "shop"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "py-2.5 rounded-lg text-sm font-medium transition-all",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            )}
          >
            {t === "customer" ? "Customer Sale" : "Shop Sale"}
          </button>
        ))}
      </div>

      {/* Sale form */}
      <div className="min-h-[300px]">
        {tab === "customer" ? (
          <CustomerSale />
        ) : (
          <ShopSale shops={shops} onShopAdded={(s) => setShops((prev) => [s, ...prev])} />
        )}
      </div>

      {/* Recent Sales */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-500">Recent Sales</p>
        {loadingRecent ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : recentSales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No sales yet</p>
        ) : (
          recentSales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {sale.phone.model} · {sale.phone.storage}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {sale.saleType === "shop" && sale.shopBuyer
                    ? sale.shopBuyer.name
                    : sale.customerName || "Walk-in"}
                  {" · "}
                  {new Date(sale.soldAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                </p>
              </div>
              <div className="text-right flex-shrink-0 space-y-1">
                <p className="text-sm font-semibold text-gray-900">{formatPKR(Number(sale.sellingPrice))}</p>
                <Badge className={cn("border-0 text-xs", STATUS_COLORS[sale.saleType])}>
                  {sale.saleType}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
