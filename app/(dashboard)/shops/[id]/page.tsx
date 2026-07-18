"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Plus, Pencil, Calendar, Loader2, Trash2 } from "lucide-react"
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
interface PriorBalance {
  id: string; amount: number; amountPaid: number; description: string; createdAt: string; paymentNotes?: string | null
}

const PAYMENT_METHODS = ["Cash", "Online Transfer", "Cheque", "Other"] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

const METHOD_COLORS: Record<string, string> = {
  "Cash": "bg-green-50 text-green-700",
  "Online Transfer": "bg-blue-50 text-blue-700",
  "Cheque": "bg-purple-50 text-purple-700",
  "Other": "bg-gray-100 text-gray-600",
}

function getMethodInfo(notes: string | null) {
  if (!notes) return null
  const sep = notes.indexOf(":")
  const method = sep > -1 ? notes.slice(0, sep).trim() : notes.trim()
  const detail = sep > -1 ? notes.slice(sep + 1).trim() : null
  const isKnown = PAYMENT_METHODS.includes(method as PaymentMethod)
  return { method: isKnown ? method : notes, detail: isKnown ? detail : null, color: METHOD_COLORS[method] ?? "bg-gray-100 text-gray-600" }
}
interface Shop {
  id: string; name: string; phone: string | null; address: string | null; notes: string | null
  outstanding: number; saleOutstanding: number
  allPayments: SalePaymentItem[]; sales: SaleItem[]
  priorBalances: PriorBalance[]
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

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Add Prior Balance dialog
  const [addBalanceOpen, setAddBalanceOpen] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState("")
  const [balanceDesc, setBalanceDesc] = useState("")
  const [addingBalance, setAddingBalance] = useState(false)

  // Receive payment for a prior balance dialog
  const [receiveBalanceDialog, setReceiveBalanceDialog] = useState<PriorBalance | null>(null)
  const [receiveBalanceAmount, setReceiveBalanceAmount] = useState("")
  const [receivingBalance, setReceivingBalance] = useState(false)

  // Payment method state for each dialog (Cash is the default)
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Cash")
  const [payExtraNotes, setPayExtraNotes] = useState("")
  const [salePayMethod, setSalePayMethod] = useState<PaymentMethod>("Cash")
  const [salePayExtraNotes, setSalePayExtraNotes] = useState("")
  const [balanceMethod, setBalanceMethod] = useState<PaymentMethod>("Cash")

  async function load() {
    const res = await fetch(`/api/shops/${id}`)
    if (!res.ok) { router.push("/shops"); return }
    const data = await res.json()
    setShop(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id, router])

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
    const combinedNotes = payMethod + (payExtraNotes.trim() ? `: ${payExtraNotes.trim()}` : "")
    const res = await fetch(`/api/shops/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(payAmount), notes: combinedNotes }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to record payment")
    } else {
      toast.success("Payment recorded")
      setPayDialog(false); setPayAmount(""); setPayNotes(""); setPayMethod("Cash"); setPayExtraNotes("")
      load()
    }
    setPaying(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/shops/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Shop deleted")
      router.push("/shops")
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to delete shop")
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function handleAddPriorBalance() {
    if (!balanceAmount || Number(balanceAmount) <= 0) { toast.error("Enter a valid amount"); return }
    if (!balanceDesc.trim()) { toast.error("Description is required"); return }
    setAddingBalance(true)
    const res = await fetch(`/api/shops/${id}/prior-balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(balanceAmount), description: balanceDesc.trim() }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to add balance")
    } else {
      toast.success("Prior balance added")
      setAddBalanceOpen(false)
      setBalanceAmount(""); setBalanceDesc("")
      load()
    }
    setAddingBalance(false)
  }

  async function handleReceivePriorBalance() {
    if (!receiveBalanceDialog || !receiveBalanceAmount || Number(receiveBalanceAmount) <= 0) return
    setReceivingBalance(true)
    const res = await fetch(`/api/shops/${id}/prior-balances/${receiveBalanceDialog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(receiveBalanceAmount), notes: balanceMethod }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to record payment")
    } else {
      toast.success("Payment recorded")
      setReceiveBalanceDialog(null); setReceiveBalanceAmount(""); setBalanceMethod("Cash")
      load()
    }
    setReceivingBalance(false)
  }

  async function handleDeletePriorBalance(balanceId: string) {
    const res = await fetch(`/api/shops/${id}/prior-balances/${balanceId}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to delete")
    } else {
      toast.success("Balance removed")
      load()
    }
  }

  async function handleSalePayment() {
    if (!salePayDialog || !salePayAmount || Number(salePayAmount) <= 0) return
    setSalePaySaving(true)
    const combinedNotes = salePayMethod + (salePayExtraNotes.trim() ? `: ${salePayExtraNotes.trim()}` : "")
    const res = await fetch(`/api/sales/${salePayDialog.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(salePayAmount), notes: combinedNotes }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed")
    } else {
      toast.success("Payment recorded")
      setSalePayDialog(null); setSalePayAmount(""); setSalePayNotes(""); setSalePayMethod("Cash"); setSalePayExtraNotes("")
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
        <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="h-9 w-9">
          <Trash2 className="w-4 h-4 text-red-400" />
        </Button>
      </div>

      {/* Outstanding balance card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Owes You</p>
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
              {shop.allPayments.slice(0, 5).map((p) => {
                const info = getMethodInfo(p.notes)
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500 flex-wrap">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{new Date(p.receivedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>
                      {info && (
                        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", info.color)}>{info.method}</span>
                      )}
                      {info?.detail && <span className="text-gray-400 text-xs">· {info.detail}</span>}
                    </div>
                    <span className="font-medium text-gray-800 flex-shrink-0 ml-2">{formatPKR(Number(p.amount))}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prior Balances section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Prior Balances</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Outstanding amounts not linked to specific phones</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setBalanceAmount(""); setBalanceDesc(""); setAddBalanceOpen(true) }} className="h-8">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {shop.priorBalances.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No prior balances recorded</p>
          ) : (
            <div className="space-y-3">
              {shop.priorBalances.map((pb) => {
                const remaining = pb.amount - pb.amountPaid
                return (
                  <div key={pb.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{pb.description}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">Total: {formatPKR(pb.amount)}</span>
                          {pb.amountPaid > 0 && (
                            <span className="text-xs text-green-600">
                              Paid: {formatPKR(pb.amountPaid)}
                              {pb.paymentNotes && ` · ${pb.paymentNotes}`}
                            </span>
                          )}
                          <span className={cn("text-xs font-semibold", remaining > 0 ? "text-orange-600" : "text-green-600")}>
                            {remaining > 0 ? `Remaining: ${formatPKR(remaining)}` : "Settled ✓"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(pb.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {remaining > 0 && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs"
                            onClick={() => { setReceiveBalanceDialog(pb); setReceiveBalanceAmount("") }}
                          >
                            Receive
                          </Button>
                        )}
                        {pb.amountPaid === 0 && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletePriorBalance(pb.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
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
      <Dialog open={payDialog} onOpenChange={(v) => { if (!v) { setPayDialog(false); setPayMethod("Cash"); setPayExtraNotes("") } }}>
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
              <Label>Payment Method *</Label>
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m} type="button"
                    onClick={() => setPayMethod(m)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      payMethod === m
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Extra Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input placeholder="e.g. Meezan Bank, Ali bhai" value={payExtraNotes} onChange={(e) => setPayExtraNotes(e.target.value)} className="h-11" />
            </div>
            <p className="text-xs text-gray-400">
              Prior balances are cleared first, then oldest phone sales.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayDialog(false); setPayMethod("Cash"); setPayExtraNotes("") }}>Cancel</Button>
            <Button onClick={handleBulkPayment} disabled={paying}>
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-sale payment dialog */}
      <Dialog open={salePayDialog !== null} onOpenChange={(v) => { if (!v) { setSalePayDialog(null); setSalePayMethod("Cash"); setSalePayExtraNotes("") } }}>
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
                <Label>Payment Method *</Label>
                <div className="flex gap-2 flex-wrap">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m} type="button"
                      onClick={() => setSalePayMethod(m)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                        salePayMethod === m
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Extra Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input placeholder="e.g. Meezan Bank" value={salePayExtraNotes} onChange={(e) => setSalePayExtraNotes(e.target.value)} className="h-11" />
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

      {/* Add Prior Balance dialog */}
      <Dialog open={addBalanceOpen} onOpenChange={(v) => { if (!v) setAddBalanceOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Prior Balance</DialogTitle>
            <DialogDescription className="text-xs">
              Record an outstanding amount this shop owes you from before the software was set up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Amount (PKR) *</Label>
              <Input
                type="number" min={1}
                placeholder="e.g. 50000"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                className="h-11 text-base"
              />
              {balanceAmount && <p className="text-xs text-gray-400">{formatPKR(Number(balanceAmount))}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description / Reason *</Label>
              <Input
                placeholder="e.g. 15 phones sold in June 2026"
                value={balanceDesc}
                onChange={(e) => setBalanceDesc(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBalanceOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPriorBalance} disabled={addingBalance}>
              {addingBalance ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive payment for a prior balance dialog */}
      <Dialog open={receiveBalanceDialog !== null} onOpenChange={(v) => { if (!v) { setReceiveBalanceDialog(null); setBalanceMethod("Cash") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription className="text-xs">Prior balance payment</DialogDescription>
          </DialogHeader>
          {receiveBalanceDialog && (
            <div className="space-y-3 py-1">
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-3 text-sm">
                  <p className="font-medium">{receiveBalanceDialog.description}</p>
                  <p className="text-gray-500 mt-0.5">
                    Remaining: {formatPKR(receiveBalanceDialog.amount - receiveBalanceDialog.amountPaid)}
                  </p>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label>Amount Received (PKR) *</Label>
                <Input
                  type="number" min={1}
                  placeholder={`Max: ${formatPKR(receiveBalanceDialog.amount - receiveBalanceDialog.amountPaid)}`}
                  value={receiveBalanceAmount}
                  onChange={(e) => setReceiveBalanceAmount(e.target.value)}
                  className="h-11 text-base"
                />
                {receiveBalanceAmount && <p className="text-xs text-gray-400">{formatPKR(Number(receiveBalanceAmount))}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <div className="flex gap-2 flex-wrap">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m} type="button"
                      onClick={() => setBalanceMethod(m)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                        balanceMethod === m
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReceiveBalanceDialog(null); setBalanceMethod("Cash") }}>Cancel</Button>
            <Button onClick={handleReceivePriorBalance} disabled={receivingBalance}>
              {receivingBalance ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
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

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {shop.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 pb-2">
            This will permanently delete this shop buyer. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
