"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react"
import { useLotFormStore } from "@/lib/stores/lot-form-store"
import { AddPhoneGroupDialog } from "./AddPhoneGroupDialog"
import { useState } from "react"
import { validateIMEI } from "@/lib/utils/imei"
import { cn } from "@/lib/utils"

export function BulkPhoneEntry() {
  const { groups, addGroup, removeGroup, updateIMEI, totalPhones } = useLotFormStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  function getRefKey(groupId: string, idx: number) {
    return `${groupId}-${idx}`
  }

  function handleIMEIChange(groupId: string, idx: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 15)
    updateIMEI(groupId, idx, cleaned)

    // Auto-advance to next slot when 15 digits entered
    if (cleaned.length === 15) {
      const group = groups.find((g) => g.id === groupId)
      if (!group) return
      const nextIdx = idx + 1
      if (nextIdx < group.phones.length) {
        const nextKey = getRefKey(groupId, nextIdx)
        inputRefs.current.get(nextKey)?.focus()
      } else {
        // Move to first IMEI of next group
        const groupIdx = groups.findIndex((g) => g.id === groupId)
        const nextGroup = groups[groupIdx + 1]
        if (nextGroup) {
          const nextKey = getRefKey(nextGroup.id, 0)
          inputRefs.current.get(nextKey)?.focus()
        }
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
            {total > 0 ? `${total} phones added across ${groups.length} group${groups.length !== 1 ? "s" : ""}` : "Add groups of phones with shared attributes"}
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
                <span className="text-xs text-gray-500">PKR {Number(group.costPrice).toLocaleString()} each</span>
                <span className="text-xs text-gray-500">×{group.quantity}</span>
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

          {/* IMEI slots */}
          <div className="p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Enter IMEI Numbers
            </p>
            {group.phones.map((phone, idx) => {
              const refKey = getRefKey(group.id, idx)
              const isValid = phone.imei.length === 15 && validateIMEI(phone.imei)
              const isInvalid = phone.imei.length === 15 && !validateIMEI(phone.imei)
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">
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
