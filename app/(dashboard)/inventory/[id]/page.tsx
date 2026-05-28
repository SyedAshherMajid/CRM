"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Copy, Pencil, AlertTriangle, RotateCcw, CheckCircle, Loader2 } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"
import { CONDITION_OPTIONS } from "@/lib/phone-models"

interface SalePayment { id: string; amount: string; receivedAt: string; notes: string | null }
interface Phone {
  id: string
  brand: string
  model: string
  storage: string
  color: string
  imei: string
  condition: string
  ptaStatus: string | null
  batteryHealth: number | null
  costPrice: string
  status: string
  notes: string | null
  createdAt: string
  lot: { id: string; name: string; supplier: { name: string } | null }
  adder: { name: string }
  sale: {
    id: string
    saleType: string
    customerName: string | null
    shopBuyer: { id: string; name: string } | null
    sellingPrice: string
    amountReceived: string
    soldAt: string
    notes: string | null
    payments: SalePayment[]
  } | null
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  defective: "bg-red-100 text-red-700",
  returned: "bg-gray-100 text-gray-600",
}

export default function PhoneDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [phone, setPhone] = useState<Phone | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editColor, setEditColor] = useState("")
  const [editCondition, setEditCondition] = useState("")
  const [editBattery, setEditBattery] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Status change dialog state
  const [statusDialog, setStatusDialog] = useState<"defective" | "returned" | "available" | null>(null)
  const [statusNotes, setStatusNotes] = useState("")
  const [changingStatus, setChangingStatus] = useState(false)

  async function load() {
    const res = await fetch(`/api/phones/${id}`)
    if (!res.ok) { router.push("/inventory"); return }
    const data = await res.json()
    setPhone(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function openEdit() {
    if (!phone) return
    setEditColor(phone.color)
    setEditCondition(phone.condition)
    setEditBattery(phone.batteryHealth ? String(phone.batteryHealth) : "")
    setEditNotes(phone.notes ?? "")
    setEditOpen(true)
  }

  async function handleEdit() {
    setSaving(true)
    const res = await fetch(`/api/phones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        color: editColor,
        condition: editCondition,
        batteryHealth: editBattery ? Number(editBattery) : null,
        notes: editNotes || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to save")
    } else {
      const updated = await res.json()
      setPhone((prev) => prev ? { ...prev, ...updated } : null)
      toast.success("Phone updated")
      setEditOpen(false)
    }
    setSaving(false)
  }

  async function handleStatusChange() {
    if (!statusDialog) return
    setChangingStatus(true)
    const res = await fetch(`/api/phones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: statusDialog,
        notes: statusNotes || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to update status")
    } else {
      const updated = await res.json()
      setPhone((prev) => prev ? { ...prev, status: updated.status, notes: updated.notes } : null)
      toast.success(
        statusDialog === "defective" ? "Marked as defective"
        : statusDialog === "returned" ? "Marked as returned"
        : "Restored to available"
      )
      setStatusDialog(null)
      setStatusNotes("")
    }
    setChangingStatus(false)
  }

  function copyIMEI() {
    if (!phone) return
    navigator.clipboard.writeText(phone.imei)
    toast.success("IMEI copied")
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )

  if (!phone) return null

  const profit = phone.sale
    ? Number(phone.sale.sellingPrice) - Number(phone.costPrice)
    : null
  const amountPending = phone.sale
    ? Number(phone.sale.sellingPrice) - Number(phone.sale.amountReceived)
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {phone.model}
          </h1>
          <p className="text-sm text-gray-500">{phone.storage} · {phone.color}</p>
        </div>
        <Badge className={cn("border-0 capitalize flex-shrink-0 mt-1", STATUS_COLORS[phone.status])}>
          {phone.status}
        </Badge>
      </div>

      {/* IMEI card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">IMEI Number</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-semibold text-gray-900 tracking-wider">
              {phone.imei}
            </p>
            <Button variant="ghost" size="icon" onClick={copyIMEI} className="h-8 w-8 flex-shrink-0">
              <Copy className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details card */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Details</p>
          {[
            { label: "Brand", value: phone.brand },
            { label: "Condition", value: phone.condition },
            { label: "PTA Status", value: phone.ptaStatus ?? "—" },
            { label: "Battery Health", value: phone.batteryHealth ? `${phone.batteryHealth}%` : "—" },
            { label: "Cost Price", value: formatPKR(Number(phone.costPrice)) },
            { label: "Notes", value: phone.notes ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lot card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Purchase Lot</p>
          <Link href={`/lots/${phone.lot.id}`} className="flex items-center justify-between group">
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-black">{phone.lot.name}</p>
              {phone.lot.supplier && (
                <p className="text-xs text-gray-400 mt-0.5">{phone.lot.supplier.name}</p>
              )}
            </div>
            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180 group-hover:text-black" />
          </Link>
          <p className="text-xs text-gray-400 mt-2">
            Added by {phone.adder.name} · {new Date(phone.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </CardContent>
      </Card>

      {/* Sale card */}
      {phone.sale && (
        <Card className="shadow-sm border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-3">Sale Info</p>
            {[
              {
                label: "Sold To",
                value: phone.sale.saleType === "shop" && phone.sale.shopBuyer
                  ? phone.sale.shopBuyer.name
                  : phone.sale.customerName || "Walk-in customer",
              },
              { label: "Selling Price", value: formatPKR(Number(phone.sale.sellingPrice)) },
              { label: "Cost Price", value: formatPKR(Number(phone.costPrice)) },
              { label: "Profit", value: profit !== null ? formatPKR(profit) : "—" },
              { label: "Amount Received", value: formatPKR(Number(phone.sale.amountReceived)) },
              { label: "Amount Pending", value: amountPending !== null ? formatPKR(amountPending) : "—" },
              {
                label: "Sold On",
                value: new Date(phone.sale.soldAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={cn(
                  "text-sm font-medium text-right",
                  label === "Profit" && profit !== null && profit >= 0 ? "text-green-600" :
                  label === "Profit" && profit !== null && profit < 0 ? "text-red-600" :
                  label === "Amount Pending" && amountPending && amountPending > 0 ? "text-orange-600" :
                  "text-gray-900"
                )}>
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {phone.status !== "sold" && (
        <div className="space-y-2 pb-4">
          <Button variant="outline" onClick={openEdit} className="w-full h-11">
            <Pencil className="w-4 h-4 mr-2" /> Edit Details
          </Button>
          {phone.status === "available" && (
            <>
              <Button
                variant="outline"
                onClick={() => { setStatusNotes(""); setStatusDialog("defective") }}
                className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <AlertTriangle className="w-4 h-4 mr-2" /> Mark as Defective
              </Button>
              <Button
                variant="outline"
                onClick={() => { setStatusNotes(""); setStatusDialog("returned") }}
                className="w-full h-11 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Mark as Returned
              </Button>
            </>
          )}
          {(phone.status === "defective" || phone.status === "returned") && (
            <Button
              variant="outline"
              onClick={() => { setStatusNotes(""); setStatusDialog("available") }}
              className="w-full h-11 border-green-200 text-green-700 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Restore to Available
            </Button>
          )}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false) }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Phone Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                placeholder="e.g. Midnight Black"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <div className="flex flex-wrap gap-2">
                {CONDITION_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditCondition(c)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      editCondition === c
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Battery Health % <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                type="number"
                min={1} max={100}
                placeholder="e.g. 85"
                value={editBattery}
                onChange={(e) => setEditBattery(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="Any notes..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !editColor.trim() || !editCondition}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status change confirmation dialog */}
      <Dialog open={statusDialog !== null} onOpenChange={(v) => { if (!v) setStatusDialog(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {statusDialog === "defective" && "Mark as Defective?"}
              {statusDialog === "returned" && "Mark as Returned?"}
              {statusDialog === "available" && "Restore to Available?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-gray-600">
              {statusDialog === "defective" && "This phone will be removed from available stock."}
              {statusDialog === "returned" && "This phone will be marked as returned to the supplier."}
              {statusDialog === "available" && "This phone will be moved back to available stock."}
            </p>
            {statusDialog !== "available" && (
              <div className="space-y-1.5">
                <Label>Reason <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder={statusDialog === "defective" ? "e.g. Cracked screen, dead battery..." : "e.g. Wrong model, damaged..."}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancel</Button>
            <Button
              onClick={handleStatusChange}
              disabled={changingStatus}
              className={cn(
                statusDialog === "defective" && "bg-red-600 hover:bg-red-700",
                statusDialog === "returned" && "bg-gray-600 hover:bg-gray-700",
              )}
            >
              {changingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
