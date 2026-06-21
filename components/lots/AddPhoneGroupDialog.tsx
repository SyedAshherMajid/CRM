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

const PTA_OPTIONS: Record<string, string[]> = {
  iPhone: ["JV", "PTA", "Non-PTA"],
  "Google Pixel": ["PTA", "Non-PTA", "Patched", "CPID"],
}

export function AddPhoneGroupDialog({ open, onClose, onAdd }: Props) {
  const [brand, setBrand] = useState<"iPhone" | "Google Pixel">("iPhone")
  const [model, setModel] = useState("")
  const [storage, setStorage] = useState("")
  const [color, setColor] = useState("")
  const [condition, setCondition] = useState("")
  const [ptaStatus, setPtaStatus] = useState("")
  const [batteryHealth, setBatteryHealth] = useState("")
  const [quantity, setQuantity] = useState("")

  function reset() {
    setModel(""); setStorage(""); setColor(""); setCondition("")
    setPtaStatus(""); setBatteryHealth(""); setQuantity("")
  }

  function handleBrandChange(b: "iPhone" | "Google Pixel") {
    setBrand(b)
    setModel("")
    setPtaStatus("")
  }

  function handleAdd() {
    if (!model || !storage || !color || !condition || !ptaStatus || !quantity) return
    onAdd({
      brand,
      model,
      storage,
      color: color.trim(),
      condition,
      ptaStatus,
      batteryHealth: batteryHealth ? Number(batteryHealth) : undefined,
      quantity: Number(quantity),
    })
    reset()
    onClose()
  }

  const models = ALL_MODELS[brand]
  const ptaOptions = PTA_OPTIONS[brand]
  const isValid = model && storage && color.trim() && condition && ptaStatus && Number(quantity) > 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-sm w-full flex flex-col max-h-[92vh] p-0 gap-0">
        {/* Fixed header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <DialogTitle>Add Phone Group</DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            You&apos;ll enter the price of each phone individually on the next screen.
          </p>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Brand */}
          <div className="space-y-1.5">
            <Label>Brand *</Label>
            <div className="grid grid-cols-2 gap-2">
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBrandChange(b)}
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
                  type="button"
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
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    condition === c
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* PTA Status */}
          <div className="space-y-1.5">
            <Label>PTA Status *</Label>
            <div className="flex flex-wrap gap-2">
              {ptaOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPtaStatus(p)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    ptaStatus === p
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Battery Health & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Battery % <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                type="number"
                placeholder="e.g. 85"
                min={1} max={100}
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(e.target.value)}
                className="h-11"
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

        {/* Fixed footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <Button variant="outline" onClick={() => { reset(); onClose() }} className="flex-1 h-11">
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!isValid} className="flex-1 h-11">
            Add {quantity ? `${quantity} Phone${Number(quantity) !== 1 ? "s" : ""}` : "Phones"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
