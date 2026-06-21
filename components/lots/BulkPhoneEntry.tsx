"use client"

import { useRef } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react"
import { useLotFormStore } from "@/lib/stores/lot-form-store"
import { AddPhoneGroupDialog } from "./AddPhoneGroupDialog"
import { validateIMEI } from "@/lib/utils/imei"
import { cn } from "@/lib/utils"
import { STORAGE_OPTIONS, CONDITION_OPTIONS } from "@/lib/phone-models"

const selectCls = "w-full h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

export function BulkPhoneEntry() {
  const { groups, addGroup, removeGroup, updateIMEI, updatePhoneField, totalPhones } = useLotFormStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  function getRefKey(groupId: string, idx: number) {
    return `${groupId}-${idx}`
  }

  function handleIMEIChange(groupId: string, idx: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 15)
    updateIMEI(groupId, idx, cleaned)

    if (cleaned.length === 15) {
      const group = groups.find((g) => g.id === groupId)
      if (!group) return
      const nextIdx = idx + 1
      if (nextIdx < group.phones.length) {
        inputRefs.current.get(getRefKey(groupId, nextIdx))?.focus()
      } else {
        const groupIdx = groups.findIndex((g) => g.id === groupId)
        const nextGroup = groups[groupIdx + 1]
        if (nextGroup) inputRefs.current.get(getRefKey(nextGroup.id, 0))?.focus()
      }
    }
  }

  const total = totalPhones()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Phone Groups</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {total > 0
              ? `${total} phones across ${groups.length} group${groups.length !== 1 ? "s" : ""}`
              : "Add groups of phones with shared attributes"}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="h-9">
          <Plus className="w-4 h-4 mr-1" /> Add Group
        </Button>
      </div>

      {groups.length === 0 && (
        <div
          onClick={() => setDialogOpen(true)}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <Plus className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Tap to add your first phone group</p>
          <p className="text-xs text-gray-300 mt-1">e.g. 20 × iPhone 13 Pro Max 256GB Gold</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Group header */}
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">
                {group.model} · {group.storage} · {group.color}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">{group.condition}</Badge>
                {group.ptaStatus && (
                  <Badge variant="outline" className="text-xs">{group.ptaStatus}</Badge>
                )}
                <span className="text-xs text-gray-500">×{group.quantity} phones</span>
                {group.batteryHealth && (
                  <span className="text-xs text-gray-500">🔋 {group.batteryHealth}%</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={() => removeGroup(group.id)}
              className="h-8 w-8 text-red-400 hover:text-red-600 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* IMEI + price slots */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Enter IMEI &amp; price for each phone
            </p>

            {group.phones.map((phone, idx) => {
              const refKey = getRefKey(group.id, idx)
              const isValid = phone.imei.length === 15 && validateIMEI(phone.imei)
              const isInvalid = phone.imei.length === 15 && !validateIMEI(phone.imei)
              const priceEmpty = phone.imei.trim() !== "" && phone.costPrice <= 0

              const storageChanged = phone.storage !== group.storage
              const colorChanged = phone.color !== group.color
              const conditionChanged = phone.condition !== group.condition
              const batteryChanged = phone.batteryHealth !== group.batteryHealth

              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg border p-2.5 space-y-2 transition-colors",
                    (storageChanged || colorChanged || conditionChanged || batteryChanged)
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-gray-100 bg-white"
                  )}
                >
                  {/* Row 1: phone number + IMEI */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="relative flex-1">
                      <Input
                        ref={(el) => {
                          if (el) inputRefs.current.set(refKey, el)
                          else inputRefs.current.delete(refKey)
                        }}
                        type="tel"
                        inputMode="numeric"
                        placeholder="15-digit IMEI"
                        value={phone.imei}
                        onChange={(e) => handleIMEIChange(group.id, idx, e.target.value)}
                        className={cn(
                          "h-11 text-base font-mono pr-9",
                          isValid && "border-green-400 focus-visible:ring-green-400",
                          isInvalid && "border-red-400 focus-visible:ring-red-400"
                        )}
                        maxLength={15}
                      />
                      {isValid && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      )}
                      {isInvalid && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>

                  {/* Row 2: Cost price — required per phone */}
                  <div className="pl-8">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                        PKR
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Cost price *"
                        value={phone.costPrice > 0 ? phone.costPrice : ""}
                        onChange={(e) =>
                          updatePhoneField(group.id, idx, {
                            costPrice: e.target.value ? Number(e.target.value) : 0,
                          })
                        }
                        className={cn(
                          "h-10 text-sm pl-10",
                          priceEmpty && "border-orange-400 focus-visible:ring-orange-400"
                        )}
                        min={1}
                      />
                    </div>
                    {priceEmpty && (
                      <p className="text-xs text-orange-500 mt-0.5">Enter cost price for this phone</p>
                    )}
                  </div>

                  {/* Row 3: Per-phone overrides */}
                  <div className="grid grid-cols-2 gap-2 pl-8">
                    {/* Storage */}
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-400">Storage</p>
                      <select
                        value={phone.storage}
                        onChange={(e) => updatePhoneField(group.id, idx, { storage: e.target.value })}
                        className={cn(selectCls, storageChanged && "border-blue-400 font-medium text-blue-700")}
                      >
                        {STORAGE_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Condition */}
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-400">Condition</p>
                      <select
                        value={phone.condition}
                        onChange={(e) => updatePhoneField(group.id, idx, { condition: e.target.value })}
                        className={cn(selectCls, conditionChanged && "border-blue-400 font-medium text-blue-700")}
                      >
                        {CONDITION_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Color */}
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-400">Color</p>
                      <input
                        type="text"
                        value={phone.color}
                        onChange={(e) => updatePhoneField(group.id, idx, { color: e.target.value })}
                        placeholder={group.color}
                        className={cn(selectCls, colorChanged && "border-blue-400 font-medium text-blue-700")}
                      />
                    </div>

                    {/* Battery */}
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-400">Battery %</p>
                      <input
                        type="number"
                        min={1} max={100}
                        value={phone.batteryHealth ?? ""}
                        onChange={(e) => updatePhoneField(group.id, idx, {
                          batteryHealth: e.target.value ? Number(e.target.value) : undefined,
                        })}
                        placeholder={group.batteryHealth ? String(group.batteryHealth) : "optional"}
                        className={cn(selectCls, batteryChanged && "border-blue-400 font-medium text-blue-700")}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <AddPhoneGroupDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addGroup}
      />
    </div>
  )
}
