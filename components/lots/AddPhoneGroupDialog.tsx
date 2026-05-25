"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ALL_MODELS, STORAGE_OPTIONS, CONDITION_OPTIONS } from "@/lib/phone-models"
import type { PhoneGroup } from "@/lib/stores/lot-form-store"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (group: Omit<PhoneGroup, "id" | "phones">) => void
}

const brands = ["iPhone", "Google Pixel"] as const

export function AddPhoneGroupDialog({ open, onClose, onAdd }: Props) {
  const [brand, setBrand] = useState<"iPhone" | "Google Pixel">("iPhone")
  const [model, setModel] = useState("")
  const [storage, setStorage] = useState("")
  const [color, setColor] = useState("")
  const [condition, setCondition] = useState("")
  const [batteryHealth, setBatteryHealth] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [quantity, setQuantity] = useState("")

  function reset() {
    setModel(""); setStorage(""); setColor(""); setCondition("")
    setBatteryHealth(""); setCostPrice(""); setQuantity("")
  }

  function handleAdd() {
    if (!model || !storage || !color || !condition || !costPrice || !quantity) return
    onAdd({
      brand,
      model,
      storage,
      color: color.trim(),
      condition,
      batteryHealth: batteryHealth ? Number(batteryHealth) : undefined,
      costPrice: Number(costPrice),
      quantity: Number(quantity),
    })
    reset()
    onClose()
  }

  const models = ALL_MODELS[brand]
  const isValid = model && storage && color.trim() && condition && costPrice && Number(quantity) > 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Phone Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Brand toggle */}
          <div className="space-y-1.5">
            <Label>Brand *</Label>
            <div className="grid grid-cols-2 gap-2">
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => { setBrand(b); setModel("") }}
                  className={cn(
                    "py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors",
                    brand === b
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label>Model *</Label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select model...</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Storage */}
          <div className="space-y-1.5">
            <Label>Storage *</Label>
            <div className="flex flex-wrap gap-2">
              {STORAGE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStorage(s)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    storage === s
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color *</Label>
            <Input
              placeholder="e.g. Midnight Black, Gold, White"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <Label>Condition *</Label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select condition...</option>
              {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Battery Health — optional */}
          <div className="space-y-1.5">
            <Label>Battery Health % <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              type="number"
              placeholder="e.g. 85"
              min={1} max={100}
              value={batteryHealth}
              onChange={(e) => setBatteryHealth(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Cost price & quantity side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cost Price (PKR) *</Label>
              <Input
                type="number"
                placeholder="e.g. 85000"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="h-11"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input
                type="number"
                placeholder="e.g. 20"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11"
                min={1}
                max={500}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!isValid}>
            Add {quantity ? `${quantity} Phone${Number(quantity) !== 1 ? "s" : ""}` : "Phones"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
