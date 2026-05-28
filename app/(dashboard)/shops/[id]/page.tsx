"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Plus, Pencil, Calendar, Loader2 } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { maskIMEI } from "@/lib/utils/imei"
import { cn } from "@/lib/utils"

interface SalePaymentItem { id: string; amount: string; receivedAt: string; notes: string | null }
interface SaleItem {
  id: string; sellingPrice: string; amountReceived: string; soldAt: string
  notes: string | null
  phone: { id: string; brand: string; model: string; storage: string; color: string; imei: string; costPrice: string; lot: { id: string; name: string } }
  payments: SalePaymentItem[]
}
interface Shop {
  id: string; name: string; phone: string | null; address: string | null; notes: string | null
  outstanding: number; allPayments: SalePaymentItem[]; sales: SaleItem[]
}

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  // Payment dialog
  const [payDialog, setPayDialog] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [paying, setPaying] = useState(false)

  // Per-sale payment dialog
  const [salePayDialog, setSalePayDialog] = useState<SaleItem | null>(null)
  const [salePayAmount, setSalePayAmount] = useState("")
  const [salePayNotes, setSalePayNotes] = useState("")
  const [salePaySaving, setSalePaySaving] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  async function load() {
    const res = await fetch(`/api/shops/${id}`)
    if (!res.ok) { router.push("/shops"); return }
    const data = await res.json()
    setShop(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function openEdit() {
    if (!shop) return
    setEditName(shop.name); setEditPhone(shop.phone ?? "")
    setEditAddress(shop.address ?? ""); setEditNotes(shop.notes ?? "")
    setEditOpen(true)
  }

  async function handleEdit() {
    setEditSaving(true)
    const res = await fetch(`/api/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, phone: editPhone, address: editAddress, notes: editNotes }),
    })
    if (res.ok) {
      toast.success("Shop updated")
      setEditOpen(false)
      load()
    } else {
      toast.error("Failed to update shop")
    }
    setEditSaving(false)
  }

  async function handleBulkPayment() {
    if (!payAmount || Number(payAmount) <= 0) { toast.error("Enter a valid amount"); return }
    setPaying(true)
    const res = await fetch(`/api/shops/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(payAmount), notes: payNotes }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to record payment")
    } else {
      toast.success("Payment recorded")
      setPayDialog(false); setPayAmount(""); setPayNotes("")
      load()
    }
    setPaying(false)
  }

  async function handleSalePayment() {
    if (!salePayDialog || !salePayAmount || Number(salePayAmount) <= 0) return
    setSalePaySaving(true)
    const res = await fetch(`/api/sales/${salePayDialog.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(salePayAmount), notes: salePayNotes }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed")
    } else {
      toast.success("Payment recorded")
      setSalePayDialog(null); setSalePayAmount(""); setSalePayNotes("")
      load()
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
  if (!shop) return null

  const filteredSales = shop.sales.filter((s) => {
    const pending = Number(s.sellingPrice) - Number(s.amountReceived)
    if (activeTab === "pending") return pending > 0
    if (activeTab === "paid") return pending <= 0
    return true
  })

  const pendingCount = shop.sales.filter((s) => Number(s.sellingPrice) > Number(s.amountReceived)).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/shops")} className="h-9 w-9 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
          {shop.phone && <p className="text-sm text-gray-500 mt-0.5">{shop.phone}</p>}
          {shop.address && <p className="text-sm text-gray-400">{shop.address}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={openEdit} className="h-9 w-9">
          <Pencil className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      {/* Outstanding balance card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Owes You</p>
              <p className={cn(
                "text-2xl font-bold mt-1",
                shop.outstanding > 0 ? "text-orange-600" : "text-green-600"
              )}>
                {shop.outstanding > 0 ? formatPKR(shop.outstanding) : "All settled ✓"}
              </p>
              {pendingCount > 0 && (
                <p className="text-xs text-gray-400 mt-1">{pendingCount} sale{pendingCount !== 1 ? "s" : ""} with pending payment</p>
              )}
            </div>
            {shop.outstanding > 0 && (
              <Button onClick={() => { setPayAmount(""); setPayNotes(""); setPayDialog(true) }} className="h-9">
                <Plus className="w-3.5 h-3.5 mr-1" /> Record Payment
              </Button>
            )}
          </div>

          {shop.allPayments.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment History</p>
              {shop.allPayments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(p.receivedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>
                    {p.notes && <span className="text-gray-400">· {p.notes}</span>}
                  </div>
                  <span className="font-medium text-gray-800">{formatPKR(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales list */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="all" className="text-xs">All ({shop.sales.length})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs">Paid ({shop.sales.length - pendingCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2 mt-3">
          {filteredSales.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No sales in this category</p>
          ) : (
            filteredSales.map((sale) => {
              const pending = Number(sale.sellingPrice) - Number(sale.amountReceived)
              const profit = Number(sale.sellingPrice) - Number(sale.phone.costPrice)
              return (
                <Card key={sale.id} className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {sale.phone.model} · {sale.phone.storage} · {sale.phone.color}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{maskIMEI(sale.phone.imei)}</p>
                        <Link href={`/lots/${sale.phone.lot.id}`} className="text-xs text-gray-400 hover:text-gray-600 mt-0.5 block">
                          {sale.phone.lot.name}
                        </Link>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(sale.soldAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-semibold text-gray-900">{formatPKR(Number(sale.sellingPrice))}</p>
                        <p className={cn("text-xs font-medium", profit >= 0 ? "text-green-600" : "text-red-500")}>
                          +{formatPKR(profit)}
                        </p>
                        {pending > 0 ? (
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                            {formatPKR(pending)} due
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">Paid ✓</Badge>
                        )}
                      </div>
                    </div>

                    {/* Receive payment for this specific sale */}
                    {pending > 0 && (
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
              )
            })
          )}
        </div>
      </div>

      {/* Bulk payment dialog */}
      <Dialog open={payDialog} onOpenChange={(v) => { if (!v) setPayDialog(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment from {shop.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Amount (PKR) *</Label>
              <Input
                type="number" min={1}
                placeholder={`Max: ${formatPKR(shop.outstanding)}`}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-11 text-base"
              />
              {payAmount && <p className="text-xs text-gray-400">{formatPKR(Number(payAmount))}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input placeholder="e.g. cash, bank transfer" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="h-11" />
            </div>
            <p className="text-xs text-gray-400">
              Payment will be applied to oldest pending sales first.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkPayment} disabled={paying}>
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-sale payment dialog */}
      <Dialog open={salePayDialog !== null} onOpenChange={(v) => { if (!v) setSalePayDialog(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>
          {salePayDialog && (
            <div className="space-y-3 py-1">
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-3 text-sm">
                  <p className="font-medium">{salePayDialog.phone.model} · {salePayDialog.phone.storage}</p>
                  <p className="text-gray-500 mt-0.5">
                    Pending: {formatPKR(Number(salePayDialog.sellingPrice) - Number(salePayDialog.amountReceived))}
                  </p>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label>Amount (PKR) *</Label>
                <Input
                  type="number" min={1}
                  value={salePayAmount}
                  onChange={(e) => setSalePayAmount(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input value={salePayNotes} onChange={(e) => setSalePayNotes(e.target.value)} className="h-11" />
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

      {/* Edit shop dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Shop</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Shop Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Address <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editSaving || !editName.trim()}>
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
