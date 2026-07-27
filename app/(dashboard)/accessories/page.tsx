"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Loader2, Search, Zap } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

const CATEGORIES = ["Charger", "Cover", "Screen Protector", "Cable", "Earphones", "Other"] as const
const SALE_TYPES = ["customer", "shop"] as const

interface Lot {
  id: string; name: string; category: string; supplierName: string | null
  totalPieces: number; soldPieces: number; remainingPieces: number
  totalCost: number; costPerPiece: number; amountPaid: number; outstanding: number
  notes: string | null; createdAt: string
}

interface ShopBuyer { id: string; name: string }

export default function AccessoriesPage() {
  const router = useRouter()
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Sell dialog
  const [sellDialog, setSellDialog] = useState<Lot | null>(null)
  const [saleType, setSaleType] = useState<"customer" | "shop">("customer")
  const [shopBuyers, setShopBuyers] = useState<ShopBuyer[]>([])
  const [selectedShopId, setSelectedShopId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [sellingPricePerPiece, setSellingPricePerPiece] = useState("")
  const [amountReceived, setAmountReceived] = useState("")
  const [saleNotes, setSaleNotes] = useState("")
  const [selling, setSelling] = useState(false)

  async function load() {
    const res = await fetch("/api/accessories/lots")
    if (res.ok) setLots(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (saleType === "shop" && shopBuyers.length === 0) {
      fetch("/api/shops").then(r => r.json()).then(setShopBuyers).catch(() => {})
    }
  }, [saleType])

  function openSell(lot: Lot) {
    setSellDialog(lot)
    setSaleType("customer")
    setSelectedShopId("")
    setCustomerName("")
    setQuantity("1")
    setSellingPricePerPiece("")
    setAmountReceived("")
    setSaleNotes("")
  }

  async function handleSell() {
    if (!sellDialog) return
    if (!quantity || Number(quantity) < 1) { toast.error("Quantity must be at least 1"); return }
    if (!sellingPricePerPiece || Number(sellingPricePerPiece) <= 0) { toast.error("Selling price is required"); return }
    if (saleType === "shop" && !selectedShopId) { toast.error("Select a shop buyer"); return }

    setSelling(true)
    const res = await fetch("/api/accessories/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lotId: sellDialog.id,
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
      setSellDialog(null)
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to record sale")
    }
    setSelling(false)
  }

  const filtered = lots.filter((l) => {
    const q = search.toLowerCase()
    return !q || l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) || (l.supplierName?.toLowerCase().includes(q) ?? false)
  })

  const totalPieces = quantity ? Number(quantity) : 1
  const pricePerPiece = sellingPricePerPiece ? Number(sellingPricePerPiece) : 0
  const totalSelling = totalPieces * pricePerPiece
  const pendingAfterSale = totalSelling - (amountReceived ? Math.min(Number(amountReceived), totalSelling) : 0)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Accessories</h1>
          <p className="text-xs text-gray-400 mt-0.5">{lots.length} lot{lots.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => router.push("/accessories/new")} className="h-9">
          <Plus className="w-4 h-4 mr-1" /> New Lot
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, category, supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Zap className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-400">
            {search ? "No lots match your search" : "No accessory lots yet"}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => router.push("/accessories/new")}>
              <Plus className="w-4 h-4 mr-1" /> Add First Lot
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lot) => {
            const soldPct = lot.totalPieces > 0 ? (lot.soldPieces / lot.totalPieces) * 100 : 0
            const paidPct = lot.totalCost > 0 ? (lot.amountPaid / lot.totalCost) * 100 : 0
            return (
              <Card key={lot.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/accessories/${lot.id}`} className="font-semibold text-gray-900 hover:underline text-sm block truncate">
                        {lot.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{lot.category}</Badge>
                        {lot.supplierName && (
                          <span className="text-xs text-gray-400">{lot.supplierName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lot.remainingPieces > 0 && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => openSell(lot)}>
                          Sell
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="text-sm font-semibold">{lot.totalPieces}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-green-600">Sold</p>
                      <p className="text-sm font-semibold text-green-700">{lot.soldPieces}</p>
                    </div>
                    <div className={cn("rounded-lg p-2", lot.remainingPieces > 0 ? "bg-blue-50" : "bg-gray-50")}>
                      <p className="text-xs text-blue-600">Left</p>
                      <p className={cn("text-sm font-semibold", lot.remainingPieces > 0 ? "text-blue-700" : "text-gray-400")}>{lot.remainingPieces}</p>
                    </div>
                  </div>

                  {/* Sold progress */}
                  <div className="mb-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${soldPct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatPKR(lot.costPerPiece)} / piece</p>
                  </div>

                  {/* Supplier payment */}
                  {lot.outstanding > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Owed to supplier</span>
                        <span className="text-orange-600 font-medium">{formatPKR(lot.outstanding)}</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-orange-300 rounded-full" style={{ width: `${Math.min(100, paidPct)}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Sell dialog */}
      <Dialog open={sellDialog !== null} onOpenChange={(v) => { if (!v) setSellDialog(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sell Accessories</DialogTitle>
            {sellDialog && (
              <DialogDescription className="text-xs">
                {sellDialog.name} · {sellDialog.remainingPieces} piece{sellDialog.remainingPieces !== 1 ? "s" : ""} available
              </DialogDescription>
            )}
          </DialogHeader>
          {sellDialog && (
            <div className="space-y-3 py-1">
              {/* Sale type */}
              <div className="space-y-1.5">
                <Label>Sale To *</Label>
                <div className="flex gap-2">
                  {SALE_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setSaleType(t)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize",
                        saleType === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {t === "customer" ? "Customer" : "Shop Buyer"}
                    </button>
                  ))}
                </div>
              </div>

              {saleType === "shop" ? (
                <div className="space-y-1.5">
                  <Label>Shop Buyer *</Label>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select shop...</option>
                    {shopBuyers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Customer Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    placeholder="Walk-in customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity *</Label>
                  <Input
                    type="number" min={1} max={sellDialog.remainingPieces}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Price / Piece (PKR) *</Label>
                  <Input
                    type="number" min={1}
                    value={sellingPricePerPiece}
                    onChange={(e) => setSellingPricePerPiece(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {totalSelling > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total selling</span>
                    <span className="font-semibold">{formatPKR(totalSelling)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cost ({quantity}×{formatPKR(sellDialog.costPerPiece)})</span>
                    <span>{formatPKR(Number(quantity) * sellDialog.costPerPiece)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600 pt-1 border-t border-gray-200">
                    <span>Profit</span>
                    <span>{formatPKR(totalSelling - Number(quantity) * sellDialog.costPerPiece)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Amount Received Now <span className="text-gray-400 font-normal">(can be 0)</span></Label>
                <Input
                  type="number" min={0}
                  placeholder="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="h-11"
                />
                {pendingAfterSale > 0 && amountReceived && (
                  <p className="text-xs text-orange-500">Pending after this: {formatPKR(pendingAfterSale)}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder="Any extra notes"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialog(null)}>Cancel</Button>
            <Button onClick={handleSell} disabled={selling}>
              {selling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
