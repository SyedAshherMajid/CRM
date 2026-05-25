"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Truck, Phone, Pencil, Trash2, Loader2 } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"

interface Supplier {
  id: string
  name: string
  phone: string | null
  notes: string | null
  _count: { lots: number }
  lots: { totalAmount: string; amountPaid: string }[]
}

const emptyForm = { name: "", phone: "", notes: "" }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function loadSuppliers() {
    const res = await fetch("/api/suppliers")
    const data = await res.json()
    setSuppliers(data)
    setLoading(false)
  }

  useEffect(() => { loadSuppliers() }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, phone: s.phone ?? "", notes: s.notes ?? "" })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Supplier name is required"); return }
    setSaving(true)

    const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers"
    const method = editing ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Something went wrong")
      setSaving(false)
      return
    }

    toast.success(editing ? "Supplier updated" : "Supplier added")
    setDialogOpen(false)
    setSaving(false)
    loadSuppliers()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Cannot delete supplier")
    } else {
      toast.success("Supplier deleted")
      setSuppliers((s) => s.filter((x) => x.id !== id))
    }
    setDeleteId(null)
  }

  const totalOwed = (s: Supplier) =>
    s.lots.reduce((sum, l) => sum + (Number(l.totalAmount) - Number(l.amountPaid)), 0)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">People you buy phones from</p>
        </div>
        <Button onClick={openAdd} className="h-10">
          <Plus className="w-4 h-4 mr-1" /> Add Supplier
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No suppliers yet</p>
          <p className="text-sm mt-1">Add your first supplier to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => {
            const owed = totalOwed(s)
            return (
              <Card key={s.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {s._count.lots} lot{s._count.lots !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {s.phone && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500">
                          <Phone className="w-3.5 h-3.5" />
                          {s.phone}
                        </div>
                      )}
                      {owed > 0 && (
                        <p className="text-sm font-medium text-orange-600 mt-1.5">
                          Outstanding: {formatPKR(owed)}
                        </p>
                      )}
                      {owed === 0 && s._count.lots > 0 && (
                        <p className="text-sm text-green-600 mt-1.5">All settled ✓</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => setDeleteId(s.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Ali bhai, Khan & Sons"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              <Input
                placeholder="03xx-xxxxxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-11"
                type="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editing ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Supplier?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 py-2">
            This cannot be undone. Suppliers with purchase lots cannot be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
