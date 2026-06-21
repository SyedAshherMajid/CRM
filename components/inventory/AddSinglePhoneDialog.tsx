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

type BrandOption = "iPhone" | "Google Pixel"

const PTA_STATUS_OPTIONS = ["JV", "PTA", "Non-PTA", "Patched", "CPID"]

interface AddSinglePhoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13)
  if (digits.length <= 5) return digits
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
}

export function AddSinglePhoneDialog({ open, onOpenChange, onSuccess }: AddSinglePhoneDialogProps) {
  const [brand, setBrand] = useState<BrandOption>("iPhone")
  const [model, setModel] = useState("")
  const [storage, setStorage] = useState("")
  const [color, setColor] = useState("")
  const [condition, setCondition] = useState("")
  const [ptaStatus, setPtaStatus] = useState("")
  const [batteryHealth, setBatteryHealth] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [imei, setImei] = useState("")
  const [sellerCnic, setSellerCnic] = useState("")
  const [sellerName, setSellerName] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const models = brand === "iPhone" ? IPHONE_MODELS : PIXEL_MODELS

  function handleCnicChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSellerCnic(formatCnic(e.target.value))
  }

  function resetForm() {
    setBrand("iPhone")
    setModel("")
    setStorage("")
    setColor("")
    setCondition("")
    setPtaStatus("")
    setBatteryHealth("")
    setCostPrice("")
    setImei("")
    setSellerCnic("")
    setSellerName("")
    setNotes("")
  }

  async function handleSubmit() {
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
    const cnicDigits = sellerCnic.replace(/\D/g, "")
    if (cnicDigits.length > 0 && cnicDigits.length !== 13) {
      toast.error("CNIC must be 13 digits (e.g. 35202-1234567-1)")
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
          ptaStatus: ptaStatus || null,
          batteryHealth: batteryHealth ? parseInt(batteryHealth) : null,
          costPrice: Number(costPrice),
          imei,
          sellerCnic: sellerCnic || null,
          sellerName: sellerName.trim() || null,
          notes,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add phone")

      toast.success("Phone added to inventory")
      onOpenChange(false)
      resetForm()
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding phone")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="max-w-md w-full flex flex-col max-h-[92vh] p-0 gap-0">
        {/* Fixed header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-base">Add Single Phone</DialogTitle>
          <DialogDescription className="text-xs">
            Add a phone directly to inventory. It will be placed in the &quot;Direct Purchases&quot; lot.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* Brand */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Brand</Label>
            <Select value={brand} onValueChange={(v: BrandOption) => { setBrand(v); setModel("") }}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iPhone">iPhone</SelectItem>
                <SelectItem value="Google Pixel">Google Pixel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Model <span className="text-red-500">*</span></Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {models.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage & Color */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Storage <span className="text-red-500">*</span></Label>
              <Select value={storage} onValueChange={setStorage}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Color <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g., Gold"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Condition & PTA Status */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Condition <span className="text-red-500">*</span></Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">PTA Status</Label>
              <Select value={ptaStatus} onValueChange={setPtaStatus}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {PTA_STATUS_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Battery Health & Cost Price */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Battery % <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="e.g., 95"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Cost Price (PKR) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="e.g., 85000"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* IMEI */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">IMEI <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="15-digit IMEI number"
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
              maxLength={15}
              className="h-10 text-sm font-mono tracking-wider"
            />
            <p className="text-xs text-gray-400">{imei.length}/15 digits</p>
          </div>

          {/* Seller Name + CNIC */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Seller Name <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              type="text"
              placeholder="Name of person selling this phone"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {/* Seller CNIC */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Seller CNIC <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="35202-1234567-1"
              value={sellerCnic}
              onChange={handleCnicChange}
              maxLength={15}
              className="h-10 text-sm font-mono tracking-wider"
            />
            <p className="text-xs text-gray-400">
              CNIC of person selling this phone · {sellerCnic.replace(/\D/g, "").length}/13 digits
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g., Slight screen damage"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* Fixed footer with action buttons */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => { onOpenChange(false); resetForm() }}
            disabled={saving}
            className="flex-1 h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 h-11"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Add Phone"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
