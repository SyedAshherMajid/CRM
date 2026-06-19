"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { IPHONE_MODELS, PIXEL_MODELS, STORAGE_OPTIONS, CONDITION_OPTIONS } from "@/lib/phone-models"

interface AddSinglePhoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddSinglePhoneDialog({ open, onOpenChange, onSuccess }: AddSinglePhoneDialogProps) {
  const [brand, setBrand] = useState<"iPhone" | "Google Pixel">("iPhone")
  const [model, setModel] = useState("")
  const [storage, setStorage] = useState("")
  const [color, setColor] = useState("")
  const [condition, setCondition] = useState("")
  const [batteryHealth, setBatteryHealth] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [imei, setImei] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const models = brand === "iPhone" ? IPHONE_MODELS : PIXEL_MODELS

  async function handleSubmit() {
    // Validation
    if (!model || !storage || !color || !condition) {
      toast.error("Please fill all required fields")
      return
    }
    if (!costPrice || Number(costPrice) <= 0) {
      toast.error("Cost price must be greater than 0")
      return
    }
    if (!imei || imei.replace(/\D/g, "").length < 4) {
      toast.error("Please enter at least 4 digits of IMEI")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/phones/add-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          model,
          storage,
          color,
          condition,
          batteryHealth: batteryHealth ? parseInt(batteryHealth) : null,
          costPrice: Number(costPrice),
          imei,
          notes,
        }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to add phone")
      }

      toast.success("Phone added to inventory")
      onOpenChange(false)
      if (onSuccess) onSuccess()

      // Reset form
      setModel("")
      setStorage("")
      setColor("")
      setCondition("")
      setBatteryHealth("")
      setCostPrice("")
      setImei("")
      setNotes("")
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error adding phone"
      toast.error(errorMsg)
      console.error(errorMsg, err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Single Phone</DialogTitle>
          <DialogDescription>
            Add a single phone directly to inventory (without a purchase lot)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Brand */}
          <div>
            <Label className="text-xs font-medium">Brand</Label>
            <Select value={brand} onValueChange={(v: any) => { setBrand(v); setModel("") }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iPhone">iPhone</SelectItem>
                <SelectItem value="Google Pixel">Google Pixel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div>
            <Label className="text-xs font-medium">Model *</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage & Color - side by side */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium">Storage *</Label>
              <Select value={storage} onValueChange={setStorage}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Color *</Label>
              <Input
                type="text"
                placeholder="e.g., Gold"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <Label className="text-xs font-medium">Condition *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Battery Health */}
          <div>
            <Label className="text-xs font-medium">Battery Health (1-100%) - Optional</Label>
            <Input
              type="number"
              min="1"
              max="100"
              placeholder="e.g., 95"
              value={batteryHealth}
              onChange={(e) => setBatteryHealth(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Cost Price */}
          <div>
            <Label className="text-xs font-medium">Cost Price (PKR) *</Label>
            <Input
              type="number"
              placeholder="e.g., 85000"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* IMEI */}
          <div>
            <Label className="text-xs font-medium">IMEI (min. 4 digits) *</Label>
            <Input
              type="text"
              placeholder="e.g., 3536 or 353698078539411"
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
              maxLength={15}
              className="h-9 text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">{imei.length}/15 digits</p>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium">Notes - Optional</Label>
            <Input
              type="text"
              placeholder="e.g., Slight screen damage"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 h-9"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Phone"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
