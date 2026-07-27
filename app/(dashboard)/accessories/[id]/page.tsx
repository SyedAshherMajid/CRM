"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Plus, Loader2 } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

const PAYMENT_METHODS = ["Cash", "Online Transfer", "Cheque", "Other"] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

interface SaleRow {
  id: string; quantity: number; sellingPricePerPiece: number; totalSellingPrice: number
  amountReceived: number; pending: number; saleType: string
  shopBuyer: { id: string; name: string } | null
  customerName: string | null; soldAt: string; notes: string | null
}

interface LotDetail {
  id: string; name: string; category: string; notes: string | null
  supplier: { id: string; name: string; phone: string | null } | null
  totalPieces: number; soldPieces: number; remainingPieces: number
  totalCost: number; costPerPiece: number; amountPaid: number; outstanding: number
  totalRevenue: number; totalReceived: number; totalPending: number; profit: number
  payments: Array<{ id: string; amount: number; paidAt: string; notes: string | null }>
  sales: SaleRow[]
  createdAt: string
}

const SALE_TYPES = ["customer", "shop"] as const

export default function AccessoryLotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lot, setLot] = useState<LotDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Supplier payment dialog
  const [payDialog, setPayDialog] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Cash")
  const [payExtraNotes, setPayExtraNotes] = useState("")
  const [paying, setPaying] = useState(false)

  // Sell dialog
  const [sellDialog, setSellDialog] = useState(false)
  const [saleType, setSaleType] = useState<"customer" | "shop">("customer")
  const [shopBuyers, setShopBuyers] = useState<Array<{ id: string; name: string }>>([])
  const [selectedShopId, setSelectedShopId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [sellingPricePerPiece, setSellingPricePerPiece] = useState("")
  const [amountReceived, setAmountReceived] = useState("")
  const [saleNotes, setSaleNotes] = useState("")
  const [selling, setSelling] = useState(false)

  // Sale payment dialog
  const [salePayDialog, setSalePayDialog] = useState<SaleRow | null>(null)
  const [salePayAmount, setSalePayAmount] = useState("")
  const [salePayMethod, setSalePayMethod] = useState<PaymentMethod>("Cash")
  const [salePayExtraNotes, setSalePayExtraNotes] = useState("")
  const [salePaySaving, setSalePaySaving] = useState(false)

  async function load() {
    const res = await fetch(`/api/accessories/lots/${id}`)
    if (!res.ok) { router.push("/accessories"); return }
    setLot(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (saleType === "shop" && shopBuyers.length === 0) {
      fetch("/api/shops").then(r => r.json()).then(setShopBuyers).catch(() => {})
    }
  }, [saleType])

  async function handleSupplierPayment() {
    if (!payAmount || Number(payAmount) <= 0) { toast.error("Enter a valid amount"); return }
    setPaying(true)
    const combinedNotes = payMethod + (payExtraNotes.trim() ? `: ${payExtraNotes.trim()}` : "")
    const res = await fetch(`/api/accessories/lots/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(payAmount), notes: combinedNotes }),
    })
    if (res.ok) {
      toast.success("Payment recorded")
      setPayDialog(false); setPayAmount(""); setPayMethod("Cash"); setPayExtraNotes("")
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to record payment")
    }
    setPaying(false)
  }

  function openSell() {
    setSaleType("customer"); setSelectedShopId(""); setCustomerName("")
    setQuantity("1"); setSellingPricePerPiece(""); setAmountReceived(""); setSaleNotes("")
    setSellDialog(true)
  }

  async function handleSell() {
    if (!lot) return
    if (!quantity || Number(quantity) < 1) { toast.error("Quantity must be at least 1"); return }
    if (!sellingPricePerPiece || Number(sellingPricePerPiece) <= 0) { toast.error("Selling price is required"); return }
    if (saleType === "shop" && !selectedShopId) { toast.error("Select a shop buyer"); return }

    setSelling(true)
    const res = await fetch("/api/accessories/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lotId: id,
        quantity: Number(quantity),
        sellingPricePerPiece: Number(sellingPricePerPiece),
        amountReceived: amountReceived ? Number(amountReceived) : 0,
        saleType,
        shopBuyerId: saleType === "shop" ? selectedShopId : null,
        customerName: saleType === "customer" ? customerName.trim() || null : null,
        notes: saleNotes.trim() || null,
      }),
    })
    if (res.ok) {
      toast.success("Sale recorded")
      setSellDialog(false)
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to record sale")
    }
    setSelling(false)
  }

  async function handleSalePayment() {
    if (!salePayDialog || !salePayAmount || Number(salePayAmount) <= 0) return
    setSalePaySaving(true)
    const combinedNotes = salePayMethod + (salePayExtraNotes.trim() ? `: ${salePayExtraNotes.trim()}` : "")
    const res = await fetch(`/api/accessories/sales/${salePayDialog.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(salePayAmount), notes: combinedNotes }),
    })
    if (res.ok) {
      toast.success("Payment recorded")
      setSalePayDialog(null); setSalePayAmount(""); setSalePayMethod("Cash"); setSalePayExtraNotes("")
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed")
    }
    setSalePaySaving(false)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!lot) return null

  const paidPct = lot.totalCost > 0 ? Math.min(100, (lot.amountPaid / lot.totalCost) * 100) : 0
  const totalSelling = quantity && sellingPricePerPiece ? Number(quantity) * Number(sellingPricePerPiece) : 0

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/accessories")} className="h-9 w-9 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{lot.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{lot.category}</Badge>
            {lot.supplier && <span className="text-xs text-gray-400">{lot.supplier.name}</span>}
          </div>
        </div>
        {lot.remainingPieces > 0 && (
          <Button onClick={openSell} className="h-9">
            <Plus className="w-3.5 h-3.5 mr-1" /> Sell
          </Button>
        )}
      </div>

      {/* Stock summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-xl font-bold">{lot.totalPieces}</p>
            <p className="text-xs text-gray-400">{formatPKR(lot.costPerPiece)}/pc</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-400">Sold</p>
            <p className="text-xl font-bold text-green-600">{lot.soldPieces}</p>
            <p className="text-xs text-gray-400">{formatPKR(lot.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className={cn("shadow-sm", lot.remainingPieces === 0 ? "opacity-50" : "")}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-400">Left</p>
            <p className="text-xl font-bold text-blue-600">{lot.remainingPieces}</p>
            {lot.profit > 0 && <p className="text-xs text-green-500">+{formatPKR(lot.profit)}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Supplier payment */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Owed to Supplier</p>
              <p className={cn("text-xl font-bold mt-1", lot.outstanding > 0 ? "text-orange-600" : "text-green-600")}>
                {lot.outstanding > 0 ? formatPKR(lot.outstanding) : "Fully paid ✓"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Paid {formatPKR(lot.amountPaid)} of {formatPKR(lot.totalCost)}
              </p>
            </div>
            {lot.outstanding > 0 && (
              <Button onClick={() => { setPayAmount(""); setPayMethod("Cash"); setPayExtraNotes(""); setPayDialog(true) }} className="h-9">
                <Plus className="w-3.5 h-3.5 mr-1" /> Pay Supplier
              </Button>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
          </div>

          {/* Payment history */}
          {lot.payments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment History</p>
              {lot.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs text-gray-600">
                  <span>{new Date(p.paidAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}</span>
                  {p.notes && <span className="text-gray-400 truncate max-w-[120px] mx-2">{p.notes}</span>}
                  <span className="font-medium">{formatPKR(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales list */}
      {lot.sales.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Sales ({lot.sales.length})
            {lot.totalPending > 0 && (
              <span className="ml-2 text-orange-500 font-normal text-xs">{formatPKR(lot.totalPending)} pending</span>
            )}
          </h2>
          <div className="space-y-2">
            {lot.sales.map((sale) => (
              <Card key={sale.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        ×{sale.quantity} piece{sale.quantity !== 1 ? "s" : ""}
                        {" · "}{formatPKR(sale.sellingPricePerPiece)}/pc
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sale.saleType === "shop" ? (sale.shopBuyer?.name ?? "Shop") : (sale.customerName ?? "Customer")}
                        {" · "}{new Date(sale.soldAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-sm font-semibold">{formatPKR(sale.totalSellingPrice)}</p>
                      {sale.pending > 0 ? (
                        <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">{formatPKR(sale.pending)} due</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Paid ✓</Badge>
                      )}
                    </div>
                  </div>
                  {sale.pending > 0 && (
                    <Button
                      variant="outline" size="sm" className="w-full h-8 mt-2 text-xs"
                      onClick={() => { setSalePayDialog(sale); setSalePayAmount("") }}
                    >
                      Receive Payment
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Supplier pay dialog */}
      <Dialog open={payDialog} onOpenChange={(v) => { if (!v) setPayDialog(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pay Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Amount (PKR) *</Label>
              <Input type="number" min={1} placeholder={`Max: ${formatPKR(lot.outstanding)}`}
                value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-11 text-base" />
              {payAmount && <p className="text-xs text-gray-400">{formatPKR(Number(payAmount))}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => setPayMethod(m)}
                    className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      payMethod === m ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}>{m}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Extra Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={payExtraNotes} onChange={(e) => setPayExtraNotes(e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button onClick={handleSupplierPayment} disabled={paying}>
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell dialog */}
      <Dialog open={sellDialog} onOpenChange={(v) => { if (!v) setSellDialog(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sell Accessories</DialogTitle>
            <DialogDescription className="text-xs">{lot.remainingPieces} piece{lot.remainingPieces !== 1 ? "s" : ""} available</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Sale To *</Label>
              <div className="flex gap-2">
                {SALE_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setSaleType(t)}
                    className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                      saleType === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}>
                    {t === "customer" ? "Customer" : "Shop Buyer"}
                  </button>
                ))}
              </div>
            </div>

            {saleType === "shop" ? (
              <div className="space-y-1.5">
                <Label>Shop Buyer *</Label>
                <select value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select shop...</option>
                  {shopBuyers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Customer Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input placeholder="Walk-in customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" min={1} max={lot.remainingPieces}
                  value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Price / Piece *</Label>
                <Input type="number" min={1}
                  value={sellingPricePerPiece} onChange={(e) => setSellingPricePerPiece(e.target.value)} className="h-11" />
              </div>
            </div>

            {totalSelling > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total selling</span>
                  <span className="font-semibold">{formatPKR(totalSelling)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold pt-1 border-t border-gray-200">
                  <span>Profit</span>
                  <span>{formatPKR(totalSelling - Number(quantity) * lot.costPerPiece)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Amount Received Now <span className="text-gray-400 font-normal">(can be 0)</span></Label>
              <Input type="number" min={0} placeholder="0"
                value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialog(false)}>Cancel</Button>
            <Button onClick={handleSell} disabled={selling}>
              {selling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale payment dialog */}
      <Dialog open={salePayDialog !== null} onOpenChange={(v) => { if (!v) { setSalePayDialog(null); setSalePayMethod("Cash"); setSalePayExtraNotes("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Receive Payment</DialogTitle></DialogHeader>
          {salePayDialog && (
            <div className="space-y-3 py-1">
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-3 text-sm">
                  <p className="font-medium">×{salePayDialog.quantity} piece{salePayDialog.quantity !== 1 ? "s" : ""}</p>
                  <p className="text-gray-500 mt-0.5">Pending: {formatPKR(salePayDialog.pending)}</p>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label>Amount (PKR) *</Label>
                <Input type="number" min={1} value={salePayAmount}
                  onChange={(e) => setSalePayAmount(e.target.value)} className="h-11 text-base" />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <div className="flex gap-2 flex-wrap">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m} type="button" onClick={() => setSalePayMethod(m)}
                      className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                        salePayMethod === m ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      )}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Extra Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input value={salePayExtraNotes} onChange={(e) => setSalePayExtraNotes(e.target.value)} className="h-11" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSalePayDialog(null); setSalePayMethod("Cash"); setSalePayExtraNotes("") }}>Cancel</Button>
            <Button onClick={handleSalePayment} disabled={salePaySaving}>
              {salePaySaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
