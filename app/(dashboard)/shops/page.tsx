"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, ArrowRight, Loader2, User, Store, Calendar, ChevronLeft } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { maskIMEI } from "@/lib/utils/imei"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShopListItem {
  id: string
  name: string
  phone: string | null
  outstanding: number
  pendingCount: number
  lastTransactionAt: string | null
  totalSales: number
}

interface CustomerListItem {
  name: string
  outstanding: number
  pendingCount: number
  totalSales: number
  lastSaleAt: string | null
}

interface CustomerSale {
  id: string
  sellingPrice: number
  amountReceived: number
  pending: number
  soldAt: string
  notes: string | null
  phone: {
    id: string
    brand: string
    model: string
    storage: string
    color: string
    imei: string
    costPrice: number
    lotId: string
    lotName: string
  }
  payments: Array<{ id: string; amount: number; receivedAt: string; notes: string | null }>
}

interface CustomerDetail {
  name: string
  outstanding: number
  sales: CustomerSale[]
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BuyersPage() {
  const [tab, setTab] = useState<"shops" | "customers">("shops")

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Buyer Records</h1>
        <p className="text-xs text-gray-400 mt-0.5">Shop buyers &amp; customer ledger</p>
      </div>

      {/* Top-level tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "shops" | "customers")}>
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger value="shops" className="text-sm flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" /> Shop Buyers
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-sm flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Customers
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "shops" ? <ShopBuyersTab /> : <CustomersTab />}
    </div>
  )
}

// ─── Shop Buyers Tab (existing, untouched logic) ──────────────────────────────

function ShopBuyersTab() {
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [saving, setSaving] = useState(false)

  async function loadShops() {
    const res = await fetch("/api/shops")
    if (res.ok) setShops(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadShops() }, [])

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address }),
    })
    if (res.ok) {
      toast.success("Shop added")
      setDialogOpen(false)
      setName(""); setPhone(""); setAddress("")
      loadShops()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to add shop")
    }
    setSaving(false)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{loading ? "" : `${shops.length} shop${shops.length !== 1 ? "s" : ""}`}</p>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="h-9">
          <Plus className="w-4 h-4 mr-1" /> Add Shop
        </Button>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
      ) : shops.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Store className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium">No shop buyers yet</p>
          <p className="text-xs mt-1">Add a shop to start recording bulk sales</p>
        </div>
      ) : (
        shops.map((shop) => (
          <Link key={shop.id} href={`/shops/${shop.id}`}>
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{shop.name}</p>
                  {shop.phone && <p className="text-xs text-gray-400 mt-0.5">{shop.phone}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{shop.totalSales} sale{shop.totalSales !== 1 ? "s" : ""}</span>
                    {shop.pendingCount > 0 && (
                      <span className="text-xs text-orange-600">{shop.pendingCount} pending</span>
                    )}
                    {shop.lastTransactionAt && (
                      <span className="text-xs text-gray-400">
                        Last: {new Date(shop.lastTransactionAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-bold", shop.outstanding > 0 ? "text-orange-600" : "text-green-600")}>
                    {shop.outstanding > 0 ? formatPKR(shop.outstanding) : "Settled ✓"}
                  </p>
                  {shop.outstanding > 0 && <p className="text-xs text-gray-400 mt-0.5">outstanding</p>}
                  <ArrowRight className="w-4 h-4 text-gray-300 mt-2 ml-auto" />
                </div>
              </div>
            </div>
          </Link>
        ))
      )}

      {/* Add shop dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Shop Buyer</DialogTitle>
            <DialogDescription className="sr-only">Add a new shop buyer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Shop Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Malik Mobile" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Address <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Hall Road, Lahore" className="h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add Shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  async function loadCustomers() {
    setLoading(true)
    try {
      const res = await fetch("/api/customers")
      if (res.ok) setCustomers(await res.json())
    } catch {
      toast.error("Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCustomers() }, [])

  const filtered = search.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : customers

  const withPending = filtered.filter((c) => c.outstanding > 0)
  const settled = filtered.filter((c) => c.outstanding <= 0)

  return (
    <>
      {/* Search */}
      <Input
        placeholder="Search customer name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11"
      />

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium">
            {search ? "No customers match that name" : "No customer sales recorded yet"}
          </p>
          <p className="text-xs mt-1">Customer names are added when recording a sale</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending section */}
          {withPending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pending Payment ({withPending.length})
              </p>
              {withPending.map((c) => (
                <CustomerCard key={c.name} customer={c} onClick={() => setSelected(c.name)} />
              ))}
            </div>
          )}

          {/* Settled section */}
          {settled.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Settled ({settled.length})
              </p>
              {settled.map((c) => (
                <CustomerCard key={c.name} customer={c} onClick={() => setSelected(c.name)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer detail dialog */}
      {selected && (
        <CustomerDetailDialog
          customerName={selected}
          onClose={() => { setSelected(null); loadCustomers() }}
        />
      )}
    </>
  )
}

// ─── Customer list card ───────────────────────────────────────────────────────

function CustomerCard({ customer, onClick }: { customer: CustomerListItem; onClick: () => void }) {
  return (
    <button
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-900">{customer.name}</p>
          </div>
          <div className="flex items-center gap-3 mt-2 pl-9">
            <span className="text-xs text-gray-500">{customer.totalSales} sale{customer.totalSales !== 1 ? "s" : ""}</span>
            {customer.pendingCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-0 text-xs py-0">
                {customer.pendingCount} pending
              </Badge>
            )}
            {customer.lastSaleAt && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(customer.lastSaleAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn("text-sm font-bold", customer.outstanding > 0 ? "text-orange-600" : "text-green-600")}>
            {customer.outstanding > 0 ? formatPKR(customer.outstanding) : "Settled ✓"}
          </p>
          {customer.outstanding > 0 && <p className="text-xs text-gray-400 mt-0.5">outstanding</p>}
          <ArrowRight className="w-4 h-4 text-gray-300 mt-1 ml-auto" />
        </div>
      </div>
    </button>
  )
}

// ─── Customer detail dialog ───────────────────────────────────────────────────

function CustomerDetailDialog({ customerName, onClose }: { customerName: string; onClose: () => void }) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  // Per-sale payment
  const [salePayDialog, setSalePayDialog] = useState<CustomerSale | null>(null)
  const [salePayAmount, setSalePayAmount] = useState("")
  const [salePayNotes, setSalePayNotes] = useState("")
  const [salePaySaving, setSalePaySaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?name=${encodeURIComponent(customerName)}`)
      if (res.ok) setDetail(await res.json())
    } catch {
      toast.error("Failed to load customer")
    } finally {
      setLoading(false)
    }
  }, [customerName])

  useEffect(() => { load() }, [load])

  async function handleSalePayment() {
    if (!salePayDialog || !salePayAmount || Number(salePayAmount) <= 0) return
    setSalePaySaving(true)
    try {
      const res = await fetch(`/api/sales/${salePayDialog.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(salePayAmount), notes: salePayNotes }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to record payment")
      } else {
        toast.success("Payment recorded")
        setSalePayDialog(null); setSalePayAmount(""); setSalePayNotes("")
        load()
      }
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setSalePaySaving(false)
    }
  }

  const pendingCount = detail?.sales.filter((s) => s.pending > 0).length ?? 0
  const filteredSales = detail?.sales.filter((s) => {
    if (activeTab === "pending") return s.pending > 0
    if (activeTab === "paid") return s.pending <= 0
    return true
  }) ?? []

  return (
    <>
      <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mr-1">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <DialogTitle className="text-base leading-tight">{customerName}</DialogTitle>
                <DialogDescription className="text-xs">Customer ledger</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            ) : detail ? (
              <>
                {/* Outstanding balance card */}
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Owes You</p>
                    <p className={cn(
                      "text-2xl font-bold mt-1",
                      detail.outstanding > 0 ? "text-orange-600" : "text-green-600"
                    )}>
                      {detail.outstanding > 0 ? formatPKR(detail.outstanding) : "All settled ✓"}
                    </p>
                    {pendingCount > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {pendingCount} sale{pendingCount !== 1 ? "s" : ""} with pending payment
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Sales list */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3 h-9">
                    <TabsTrigger value="all" className="text-xs">All ({detail.sales.length})</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs">Pending ({pendingCount})</TabsTrigger>
                    <TabsTrigger value="paid" className="text-xs">Paid ({detail.sales.length - pendingCount})</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-2">
                  {filteredSales.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-6">No sales in this category</p>
                  ) : (
                    filteredSales.map((sale) => (
                      <Card key={sale.id} className="shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">
                                {sale.phone.model} · {sale.phone.storage} · {sale.phone.color}
                              </p>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{maskIMEI(sale.phone.imei)}</p>
                              <Link
                                href={`/lots/${sale.phone.lotId}`}
                                className="text-xs text-gray-400 hover:text-gray-600 mt-0.5 block"
                                onClick={onClose}
                              >
                                {sale.phone.lotName}
                              </Link>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(sale.soldAt).toLocaleDateString("en-PK", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </p>
                              {/* Payment history for this sale */}
                              {sale.payments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                                  {sale.payments.map((p) => (
                                    <div key={p.id} className="flex justify-between text-xs text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(p.receivedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                                        {p.notes && ` · ${p.notes}`}
                                      </span>
                                      <span className="font-medium">{formatPKR(p.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0 space-y-1">
                              <p className="text-sm font-semibold text-gray-900">{formatPKR(sale.sellingPrice)}</p>
                              <p className="text-xs text-gray-400">
                                Received: {formatPKR(sale.amountReceived)}
                              </p>
                              {sale.pending > 0 ? (
                                <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                                  {formatPKR(sale.pending)} due
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 border-0 text-xs">Paid ✓</Badge>
                              )}
                            </div>
                          </div>

                          {sale.pending > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 mt-2 text-xs"
                              onClick={() => { setSalePayDialog(sale); setSalePayAmount(""); setSalePayNotes("") }}
                            >
                              Receive Payment for this phone
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Per-sale payment dialog */}
      <Dialog open={salePayDialog !== null} onOpenChange={(v) => { if (!v) setSalePayDialog(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription className="sr-only">Record payment for this sale</DialogDescription>
          </DialogHeader>
          {salePayDialog && (
            <div className="space-y-3 py-1">
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-3 text-sm">
                  <p className="font-medium">{salePayDialog.phone.model} · {salePayDialog.phone.storage}</p>
                  <p className="text-gray-500 mt-0.5">Pending: {formatPKR(salePayDialog.pending)}</p>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label>Amount (PKR) *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder={`Max: ${formatPKR(salePayDialog.pending)}`}
                  value={salePayAmount}
                  onChange={(e) => setSalePayAmount(e.target.value)}
                  className="h-11 text-base"
                />
                {salePayAmount && <p className="text-xs text-gray-400">{formatPKR(Number(salePayAmount))}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. cash"
                  value={salePayNotes}
                  onChange={(e) => setSalePayNotes(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalePayDialog(null)}>Cancel</Button>
            <Button onClick={handleSalePayment} disabled={salePaySaving}>
              {salePaySaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
