"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Edit2, Trash2, Phone } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"

interface Supplier {
  id: string
  name: string
  phone: string | null
  lotsCount: number
  totalAmountOwed: number
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState("")
  const [addPhone, setAddPhone] = useState("")
  const [addNotes, setAddNotes] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await fetch("/api/suppliers")
        if (!res.ok) throw new Error("Failed to load suppliers")
        const data = await res.json()
        setSuppliers(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        toast.error("Failed to load suppliers")
      } finally {
        setLoading(false)
      }
    }
    loadSuppliers()
  }, [])

  async function handleDeleteSupplier(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return

    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setSuppliers(prev => prev.filter(s => s.id !== id))
      toast.success("Supplier deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete supplier")
    }
  }

  async function handleAddSupplier() {
    if (!addName.trim()) {
      toast.error("Supplier name is required")
      return
    }

    setAdding(true)
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          phone: addPhone.trim() || null,
          notes: addNotes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to create supplier")
      const newSupplier = await res.json()
      setSuppliers(prev => [newSupplier, ...prev])
      setAddOpen(false)
      setAddName("")
      setAddPhone("")
      setAddNotes("")
      toast.success("Supplier added")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add supplier")
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 pb-6">
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">People you buy phones from</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
      </div>

      {suppliers.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {suppliers.map(supplier => (
            <Link key={supplier.id} href={`/suppliers/${supplier.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg">{supplier.name}</h3>
                      <p className="text-sm text-gray-500">{supplier.lotsCount} lot{supplier.lotsCount !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button className="text-gray-400 hover:text-blue-600 transition" onClick={e => {e.preventDefault(); e.stopPropagation()}}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600 transition" onClick={e => {e.preventDefault(); e.stopPropagation(); handleDeleteSupplier(supplier.id, supplier.name)}}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Phone className="w-4 h-4" />
                      {supplier.phone}
                    </div>
                  )}

                  <div className={`text-sm font-medium ${supplier.totalAmountOwed > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {supplier.totalAmountOwed > 0 ? `Outstanding: ${formatPKR(supplier.totalAmountOwed)}` : "Settled"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card><CardContent className="pt-12 text-center"><p className="text-gray-500 mb-4">No suppliers yet</p><Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" />Add First Supplier</Button></CardContent></Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Enter supplier details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Ali Bhai"
                value={addName}
                onChange={e => setAddName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+92 300 1234567"
                value={addPhone}
                onChange={e => setAddPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Any notes..."
                value={addNotes}
                onChange={e => setAddNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSupplier} disabled={adding}>
                {adding ? "Adding..." : "Add Supplier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
