"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, ArrowRight, Loader2 } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

interface ShopListItem {
  id: string; name: string; phone: string | null; outstanding: number
  pendingCount: number; lastTransactionAt: string | null; totalSales: number
}

export default function ShopsPage() {
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

  useEffect(() => {
    loadShops()
  }, [])

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
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Shop Buyers</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="h-9">
          <Plus className="w-4 h-4 mr-1" /> Add Shop
        </Button>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
      ) : shops.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
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
                  <p className={cn(
                    "text-sm font-bold",
                    shop.outstanding > 0 ? "text-orange-600" : "text-green-600"
                  )}>
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
          <DialogHeader><DialogTitle>Add Shop Buyer</DialogTitle></DialogHeader>
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
    </div>
  )
}
