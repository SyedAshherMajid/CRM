"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

const CATEGORIES = ["Charger", "Cover", "Screen Protector", "Cable", "Earphones", "Other"] as const

interface Supplier { id: string; name: string }

export default function NewAccessoryLotPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [totalPieces, setTotalPieces] = useState("")
  const [totalCost, setTotalCost] = useState("")
  const [amountPaid, setAmountPaid] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetch("/api/suppliers").then(r => r.json()).then(setSuppliers).catch(() => {})
  }, [])

  const costPerPiece = totalPieces && totalCost
    ? Number(totalCost) / Number(totalPieces)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("Lot name is required"); return }
    if (!category) { toast.error("Select a category"); return }
    if (!totalPieces || Number(totalPieces) < 1) { toast.error("Total pieces must be at least 1"); return }
    if (!totalCost || Number(totalCost) <= 0) { toast.error("Total cost is required"); return }

    setSaving(true)
    const res = await fetch("/api/accessories/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        category,
        supplierId: supplierId || null,
        totalPieces: Number(totalPieces),
        totalCost: Number(totalCost),
        amountPaid: amountPaid ? Number(amountPaid) : 0,
        notes: notes.trim() || null,
      }),
    })
    if (res.ok) {
      const { id } = await res.json()
      toast.success("Accessory lot created")
      router.push(`/accessories/${id}`)
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to create lot")
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/accessories")} className="h-9 w-9">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">New Accessory Lot</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Lot Name *</Label>
              <Input
                placeholder="e.g. Samsung chargers July batch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category *</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                      category === c
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Supplier <span className="text-gray-400 font-normal">(optional)</span></Label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Pieces *</Label>
                <Input
                  type="number" min={1}
                  placeholder="e.g. 50"
                  value={totalPieces}
                  onChange={(e) => setTotalPieces(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Cost (PKR) *</Label>
                <Input
                  type="number" min={1}
                  placeholder="e.g. 25000"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {costPerPiece !== null && (
              <p className="text-xs text-gray-500 -mt-2">
                Cost per piece: <span className="font-semibold">{formatPKR(costPerPiece)}</span>
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Amount Paid Now <span className="text-gray-400 font-normal">(optional, can be 0)</span></Label>
              <Input
                type="number" min={0}
                placeholder="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="h-11"
              />
              {amountPaid && <p className="text-xs text-gray-400">{formatPKR(Number(amountPaid))}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                placeholder="Any extra notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-11"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 mt-4" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Create Lot
        </Button>
      </form>
    </div>
  )
}
