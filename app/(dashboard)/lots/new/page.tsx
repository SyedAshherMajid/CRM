"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react"
import { useLotFormStore } from "@/lib/stores/lot-form-store"
import { BulkPhoneEntry } from "@/components/lots/BulkPhoneEntry"
import { formatPKR } from "@/lib/utils/currency"

interface Supplier { id: string; name: string }

export default function NewLotPage() {
  const router = useRouter()
  const store = useLotFormStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    store.reset()
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleStep1Next() {
    if (!store.name.trim()) { toast.error("Lot name is required"); return }
    if (!store.totalAmount || Number(store.totalAmount) <= 0) {
      toast.error("Total amount must be greater than 0"); return
    }
    if (Number(store.amountPaid) > Number(store.totalAmount)) {
      toast.error("Amount paid cannot exceed total amount"); return
    }
    store.setStep(2)
  }

  async function handleSubmit() {
    const totalPhones = store.totalPhones()
    if (totalPhones === 0) {
      toast.error("Add at least one phone group before saving"); return
    }

    // Collect all phones with IMEIs filled
    const phones = store.groups.flatMap((g) =>
      g.phones
        .filter((p) => p.imei.trim())
        .map((p) => ({
          brand: g.brand,
          model: g.model,
          storage: p.storage,
          color: p.color || g.color,
          condition: p.condition,
          ptaStatus: g.ptaStatus,
          batteryHealth: p.batteryHealth,
          costPrice: g.costPrice,
          imei: p.imei,
        }))
    )

    if (phones.length === 0) {
      toast.error("Enter at least one IMEI number"); return
    }

    setSaving(true)

    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: store.name.trim(),
        supplierId: store.supplierId || null,
        totalAmount: Number(store.totalAmount),
        amountPaid: Number(store.amountPaid) || 0,
        notes: store.notes,
        phones,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? "Failed to save lot")
      setSaving(false)
      return
    }

    const lot = await res.json()
    toast.success(`Lot saved with ${phones.length} phones!`)
    store.reset()
    router.push(`/lots/${lot.id}`)
  }

  const filledIMEIs = store.groups.reduce(
    (sum, g) => sum + g.phones.filter((p) => p.imei.trim()).length, 0
  )
  const totalSlots = store.totalPhones()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost" size="icon"
          onClick={() => store.step === 2 ? store.setStep(1) : router.push("/lots")}
          className="h-9 w-9"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Purchase Lot</h1>
          <p className="text-xs text-gray-500">Step {store.step} of 2</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full flex-1 transition-colors ${store.step >= s ? "bg-black" : "bg-gray-200"}`}
          />
        ))}
      </div>

      {/* ── STEP 1: Lot Info ── */}
      {store.step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Lot Name *</Label>
            <Input
              placeholder="e.g. Ali bhai July batch, Khan lot #3"
              value={store.name}
              onChange={(e) => store.setField("name", e.target.value)}
              className="h-12 text-base"
            />
            <p className="text-xs text-gray-400">Give it a name you&apos;ll easily remember</p>
          </div>

          <div className="space-y-1.5">
            <Label>Supplier <span className="text-gray-400 font-normal">(optional)</span></Label>
            <select
              value={store.supplierId}
              onChange={(e) => store.setField("supplierId", e.target.value)}
              className="w-full h-12 rounded-md border border-input bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No supplier / Unknown</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              Don&apos;t see them? <Link href="/suppliers" className="underline text-gray-600">Add supplier first</Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Total Amount (PKR) *</Label>
              <Input
                type="number"
                placeholder="e.g. 1000000"
                value={store.totalAmount}
                onChange={(e) => store.setField("totalAmount", e.target.value)}
                className="h-12 text-base"
                min={0}
              />
              {store.totalAmount && (
                <p className="text-xs text-gray-400">{formatPKR(Number(store.totalAmount))}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Paid Now (PKR)</Label>
              <Input
                type="number"
                placeholder="e.g. 500000"
                value={store.amountPaid}
                onChange={(e) => store.setField("amountPaid", e.target.value)}
                className="h-12 text-base"
                min={0}
              />
              {store.amountPaid && (
                <p className="text-xs text-gray-400">{formatPKR(Number(store.amountPaid))}</p>
              )}
            </div>
          </div>

          {store.totalAmount && store.amountPaid && (
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-3">
                <p className="text-sm text-gray-600">
                  Remaining after this payment:{" "}
                  <span className="font-semibold text-orange-600">
                    {formatPKR(Math.max(0, Number(store.totalAmount) - Number(store.amountPaid)))}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              placeholder="Any notes about this lot..."
              value={store.notes}
              onChange={(e) => store.setField("notes", e.target.value)}
              className="h-12"
            />
          </div>

          <Button onClick={handleStep1Next} className="w-full h-12 text-base font-semibold">
            Next — Add Phones <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* ── STEP 2: Bulk Phone Entry ── */}
      {store.step === 2 && (
        <div className="space-y-6">
          {/* Lot summary card */}
          <Card className="bg-gray-50 border-0">
            <CardContent className="p-3">
              <p className="font-medium text-gray-900 text-sm">{store.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Total: {formatPKR(Number(store.totalAmount))}
                {store.amountPaid && Number(store.amountPaid) > 0
                  ? ` · Paid: ${formatPKR(Number(store.amountPaid))}`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <BulkPhoneEntry />

          {/* Progress summary */}
          {totalSlots > 0 && (
            <Card className="border-gray-200">
              <CardContent className="p-3">
                <p className="text-sm text-gray-600">
                  IMEIs filled:{" "}
                  <span className={`font-semibold ${filledIMEIs === totalSlots ? "text-green-600" : "text-orange-600"}`}>
                    {filledIMEIs} / {totalSlots}
                  </span>
                  {filledIMEIs < totalSlots && (
                    <span className="text-gray-400 text-xs ml-1">
                      (empty slots will be skipped)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleSubmit}
            disabled={saving || filledIMEIs === 0}
            className="w-full h-12 text-base font-semibold"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Lot ({filledIMEIs} phones)</>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
