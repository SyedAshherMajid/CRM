"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Plus, Calendar, Loader2, Pencil, Trash2 } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { maskIMEI } from "@/lib/utils/imei"

interface Phone {
  id: string; brand: string; model: string; storage: string; color: string
  imei: string; condition: string; ptaStatus: string | null; batteryHealth: number | null
  costPrice: string; status: string; notes: string | null
  sale: { sellingPrice: string; amountReceived: string; saleType: string; shopBuyer: { name: string } | null; customerName: string | null } | null
}
interface LotPayment { id: string; amount: string; paidAt: string; notes: string | null }
interface Lot {
  id: string; name: string; totalAmount: string; amountPaid: string
  notes: string | null; createdAt: string
  supplier: { name: string; phone: string | null } | null
  phones: Phone[]; payments: LotPayment[]
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  defective: "bg-red-100 text-red-700",
  returned: "bg-gray-100 text-gray-600",
}

export default function LotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lot, setLot] = useState<Lot | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [paying, setPaying] = useState(false)

  // Edit lot dialog
  const [editDialog, setEditDialog] = useState(false)
  const [editName, setEditName] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editing, setEditing] = useState(false)

  // Delete lot dialog
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function loadLot() {
    const res = await fetch(`/api/lots/${id}`)
    if (!res.ok) { router.push("/lots"); return }
    const data = await res.json()
    setLot(data)
    setEditName(data.name)
    setEditNotes(data.notes || "")
    setLoading(false)
  }

  useEffect(() => { loadLot() }, [id, router])

  async function handlePayment() {
    if (!payAmount || Number(payAmount) <= 0) { toast.error("Enter a valid amount"); return }
    setPaying(true)
    const res = await fetch(`/api/lots/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(payAmount), notes: payNotes }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to record payment")
    } else {
      toast.success("Payment recorded")
      setPaymentDialog(false)
      setPayAmount(""); setPayNotes("")
      loadLot()
    }
    setPaying(false)
  }

  async function handleEditLot() {
    if (!editName.trim()) {
      toast.error("Lot name is required")
      return
    }

    setEditing(true)
    try {
      const res = await fetch(`/api/lots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          notes: editNotes.trim() || null,
        }),
      })

      if (!res.ok) throw new Error("Failed to update lot")

      const updated = await res.json()
      setLot((prev) => (prev ? { ...prev, ...updated } : null))
      setEditDialog(false)
      toast.success("Lot updated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lot")
    } finally {
      setEditing(false)
    }
  }

  async function handleDeleteLot() {
    if (!confirm(`Delete lot "${lot?.name}" and all associated data?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/lots/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete lot")

      toast.success("Lot deleted!")
      router.push("/lots")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete lot")
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!lot) return null

  const total = Number(lot.totalAmount)
  const paid = Number(lot.amountPaid)
  const remaining = total - paid
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0

  const filteredPhones = lot.phones.filter((p) =>
    activeTab === "all" ? true : p.status === activeTab
  )

  const soldPhones = lot.phones.filter((p) => p.status === "sold")
  const revenue = soldPhones.reduce((s, p) => s + Number(p.sale?.sellingPrice ?? 0), 0)
  const soldCost = soldPhones.reduce((s, p) => s + Number(p.costPrice), 0)
  const profit = revenue - soldCost

  const counts = {
    all: lot.phones.length,
    available: lot.phones.filter((p) => p.status === "available").length,
    sold: lot.phones.filter((p) => p.status === "sold").length,
    defective: lot.phones.filter((p) => p.status === "defective").length,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/lots")} className="h-9 w-9 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{lot.name}</h1>
          <p className="text-sm text-gray-500">
            {lot.supplier?.name ?? "No supplier"} ·{" "}
            {new Date(lot.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            onClick={() => setEditDialog(true)}
            variant="outline"
            size="sm"
            className="h-9"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setDeleteDialog(true)}
            variant="outline"
            size="sm"
            className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Payment card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Payment Status</CardTitle>
            {remaining > 0 && (
              <Button size="sm" onClick={() => setPaymentDialog(true)} className="h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Record Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Paid</span>
            <span className="font-semibold text-green-600">{formatPKR(paid)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total: {formatPKR(total)}</span>
            {remaining > 0
              ? <span className="font-semibold text-orange-600">Remaining: {formatPKR(remaining)}</span>
              : <span className="font-semibold text-green-600">Fully Paid ✓</span>
            }
          </div>

          {lot.payments.length > 0 && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment History</p>
              {lot.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(p.paidAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>
                    {p.notes && <span className="text-gray-400">· {p.notes}</span>}
                  </div>
                  <span className="font-medium text-gray-800">{formatPKR(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot stats */}
      {soldPhones.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Revenue", value: formatPKR(revenue), color: "text-gray-900" },
            { label: "Cost", value: formatPKR(soldCost), color: "text-gray-500" },
            { label: "Profit", value: formatPKR(profit), color: profit >= 0 ? "text-green-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Phones list */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="available" className="text-xs">In Stock ({counts.available})</TabsTrigger>
            <TabsTrigger value="sold" className="text-xs">Sold ({counts.sold})</TabsTrigger>
            <TabsTrigger value="defective" className="text-xs">Defect ({counts.defective})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2 mt-3">
          {filteredPhones.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No phones in this category</p>
          ) : (
            filteredPhones.map((phone) => (
              <Card key={phone.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {phone.model} · {phone.storage} · {phone.color}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{maskIMEI(phone.imei)}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge className={`${STATUS_COLORS[phone.status]} border-0 text-xs`}>
                          {phone.status}
                        </Badge>
                        {phone.ptaStatus && (
                          <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">
                            {phone.ptaStatus}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">Cost: {formatPKR(Number(phone.costPrice))}</span>
                        {phone.batteryHealth && (
                          <span className="text-xs text-gray-400">🔋 {phone.batteryHealth}%</span>
                        )}
                      </div>
                      {phone.sale && (
                        <p className="text-xs text-blue-600 mt-1">
                          Sold for {formatPKR(Number(phone.sale.sellingPrice))}
                          {phone.sale.shopBuyer && ` → ${phone.sale.shopBuyer.name}`}
                          {phone.sale.customerName && ` → ${phone.sale.customerName}`}
                        </p>
                      )}
                    </div>
                    {phone.sale && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-green-600">
                          +{formatPKR(Number(phone.sale.sellingPrice) - Number(phone.costPrice))}
                        </p>
                        <p className="text-xs text-gray-400">profit</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Amount (PKR) *</Label>
              <Input
                type="number"
                placeholder={`Max: ${formatPKR(remaining)}`}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-11 text-base"
                min={1}
              />
              {payAmount && <p className="text-xs text-gray-400">{formatPKR(Number(payAmount))}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. bank transfer, cash"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={paying}>
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lot Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Lot</DialogTitle>
            <DialogDescription>Update lot information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Lot Name *</Label>
              <Input
                placeholder="e.g. Ali bhai July batch"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any additional notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setEditDialog(false)} variant="outline" className="h-11">
              Cancel
            </Button>
            <Button onClick={handleEditLot} disabled={editing} className="h-11">
              {editing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lot Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Lot?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{lot?.name}&quot; and all associated phones and records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button onClick={() => setDeleteDialog(false)} variant="outline" className="h-11">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteLot}
              disabled={deleting}
              className="h-11 bg-red-600 hover:bg-red-700 text-white"
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
