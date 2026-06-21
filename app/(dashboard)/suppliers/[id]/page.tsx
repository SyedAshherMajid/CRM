"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Phone as PhoneIcon, MapPin, FileText } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

interface LotPaymentItem {
  id: string
  amount: string
  paidAt: string
  notes: string | null
}

interface LotItem {
  id: string
  name: string
  totalAmount: string
  amountPaid: string
  notes: string | null
  phonesCount: number
  phonesSold: number
  payments: LotPaymentItem[]
}

interface Supplier {
  id: string
  name: string
  phone: string | null
  notes: string | null
  totalOwed: number
  allPayments: LotPaymentItem[]
  lots: LotItem[]
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editing, setEditing] = useState(false)

  // Payment dialog
  const [payDialog, setPayDialog] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [paying, setPaying] = useState(false)

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadSupplier()
  }, [id])

  async function loadSupplier() {
    try {
      const res = await fetch(`/api/suppliers/${id}`)
      if (!res.ok) throw new Error("Failed to load supplier")
      const data = await res.json()
      setSupplier(data)
      setEditName(data.name)
      setEditPhone(data.phone || "")
      setEditNotes(data.notes || "")
    } catch (err) {
      toast.error("Failed to load supplier")
    } finally {
      setLoading(false)
    }
  }

  async function handleEditSupplier() {
    if (!editName.trim()) {
      toast.error("Supplier name is required")
      return
    }

    setEditing(true)
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          notes: editNotes.trim() || null,
        }),
      })

      if (!res.ok) throw new Error("Failed to update supplier")

      const updated = await res.json()
      setSupplier((prev) => (prev ? { ...prev, ...updated } : null))
      setEditDialog(false)
      toast.success("Supplier updated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update supplier")
    } finally {
      setEditing(false)
    }
  }

  async function handleDeleteSupplier() {
    if (!confirm(`Delete "${supplier?.name}" and all associated data?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete supplier")

      toast.success("Supplier deleted!")
      router.push("/suppliers")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete supplier")
      setDeleting(false)
    }
  }

  async function handleRecordPayment() {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    setPaying(true)
    try {
      const res = await fetch(`/api/suppliers/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          notes: payNotes.trim() || null,
        }),
      })

      if (!res.ok) throw new Error("Failed to record payment")

      await loadSupplier()
      setPayDialog(false)
      setPayAmount("")
      setPayNotes("")
      toast.success("Payment recorded!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-6">
        <Link href="/suppliers" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Back to Suppliers
        </Link>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Supplier not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const remainingOwed = Number(supplier.totalOwed)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">
      {/* Back button */}
      <Link href="/suppliers" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" />
        Back to Suppliers
      </Link>

      {/* Supplier Info */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{supplier.name}</CardTitle>
            {supplier.phone && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <PhoneIcon className="w-3 h-3" />
                {supplier.phone}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setEditDialog(true)}
              variant="outline"
              size="sm"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              onClick={() => setDeleteDialog(true)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {supplier.notes && (
            <div className="flex gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{supplier.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outstanding Balance */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Outstanding Balance</p>
            <p className="text-4xl font-bold text-orange-600">
              {formatPKR(remainingOwed)}
            </p>
          </div>
          <Button
            onClick={() => setPayDialog(true)}
            className="w-full h-11 mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </CardContent>
      </Card>

      {/* Payment Record Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment to {supplier.name}</DialogTitle>
            <DialogDescription>
              Record an installment payment to this supplier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Amount (PKR) *</Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="e.g. Cash, bank transfer"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setPayDialog(false)} variant="outline" className="h-11">
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paying} className="h-11">
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Supplier Name *</Label>
              <Input
                placeholder="e.g. Ali Bhai"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="e.g. 0300-1234567"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
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
            <Button onClick={handleEditSupplier} disabled={editing} className="h-11">
              {editing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Supplier?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{supplier.name}&quot; and all associated records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button onClick={() => setDeleteDialog(false)} variant="outline" className="h-11">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSupplier}
              disabled={deleting}
              className="h-11 bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Lots from this Supplier */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Lots</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.lots && supplier.lots.length > 0 ? (
            <div className="space-y-3">
              {supplier.lots.map((lot) => (
                <Link
                  key={lot.id}
                  href={`/lots/${lot.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{lot.name}</h3>
                    <span className="text-xs font-medium text-gray-600">
                      {lot.phonesSold}/{lot.phonesCount} sold
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-medium">{formatPKR(parseInt(lot.totalAmount))}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Paid</p>
                      <p className="font-medium">{formatPKR(parseInt(lot.amountPaid))}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Remaining</p>
                      <p className="font-medium text-orange-600">
                        {formatPKR(parseInt(lot.totalAmount) - parseInt(lot.amountPaid))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-gray-500">No purchase lots from this supplier</p>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.allPayments && supplier.allPayments.length > 0 ? (
            <div className="space-y-2">
              {supplier.allPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{formatPKR(parseInt(payment.amount))}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(payment.paidAt).toLocaleDateString()}
                      {payment.notes && ` • ${payment.notes}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-gray-500">No payments recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
