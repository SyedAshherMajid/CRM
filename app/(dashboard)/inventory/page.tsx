"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, SlidersHorizontal, Plus } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { maskIMEI } from "@/lib/utils/imei"
import { cn } from "@/lib/utils"
import { IPHONE_MODELS, PIXEL_MODELS } from "@/lib/phone-models"
import { AddSinglePhoneDialog } from "@/components/inventory/AddSinglePhoneDialog"

interface PhoneListItem {
  id: string
  brand: string
  model: string
  storage: string
  color: string
  imei: string
  condition: string
  ptaStatus: string | null
  batteryHealth: number | null
  costPrice: string
  status: string
  sellerCnic: string | null
  sellerName: string | null
  lot: { id: string; name: string }
}

const STATUS_OPTS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "defective", label: "Defective" },
  { value: "returned", label: "Returned" },
]

const BRAND_OPTS = [
  { value: "all", label: "All Brands" },
  { value: "iPhone", label: "iPhone" },
  { value: "Google Pixel", label: "Pixel" },
]

const STORAGE_OPTS = [
  { value: "all", label: "All" },
  { value: "64GB", label: "64" },
  { value: "128GB", label: "128" },
  { value: "256GB", label: "256" },
  { value: "512GB", label: "512" },
  { value: "1TB", label: "1TB" },
]

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  defective: "bg-red-100 text-red-700",
  returned: "bg-gray-100 text-gray-600",
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors",
            value === opt.value
              ? "bg-black text-white border-black"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function InventoryPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [brand, setBrand] = useState("all")
  const [storage, setStorage] = useState("all")
  const [model, setModel] = useState("all")
  const [lotId, setLotId] = useState("all")
  const [phones, setPhones] = useState<PhoneListItem[]>([])
  const [lots, setLots] = useState<{ id: string; name: string }[]>([])
  const [addSinglePhoneOpen, setAddSinglePhoneOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetch("/api/lots")
      .then(async (r) => (r.ok ? r.json() : []))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data: any[]) => {
        if (Array.isArray(data)) setLots(data.map((l) => ({ id: l.id, name: l.name })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (status !== "all") params.set("status", status)
    if (brand !== "all") params.set("brand", brand)
    if (storage !== "all") params.set("storage", storage)
    if (model !== "all") params.set("model", model)
    if (lotId !== "all") params.set("lotId", lotId)

    fetch(`/api/phones?${params}`)
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data) => {
        setPhones(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [debouncedSearch, status, brand, storage, model, lotId])

  // Reset model when brand changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModel("all")
  }, [brand])

  const modelOpts = [
    { value: "all", label: "All Models" },
    ...(brand === "iPhone"
      ? IPHONE_MODELS
      : brand === "Google Pixel"
      ? PIXEL_MODELS
      : [...IPHONE_MODELS, ...PIXEL_MODELS]
    ).map((m) => ({ value: m, label: m })),
  ]

  const hasActiveFilter = status !== "all" || brand !== "all" || storage !== "all" || model !== "all" || lotId !== "all"

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => setAddSinglePhoneOpen(true)}
            className="h-9"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Single Phone
          </Button>
          {!loading && (
            <span className="text-sm text-gray-500 self-center">{phones.length} phones</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search IMEI (last 4-6 digits) or model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9 text-base"
        />
      </div>

      {/* Filter toggle */}
      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium transition-colors",
          hasActiveFilter || showFilters ? "text-black" : "text-gray-500"
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {hasActiveFilter && (
          <span className="ml-1 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {[status !== "all", brand !== "all", storage !== "all", model !== "all", lotId !== "all"].filter(Boolean).length}
          </span>
        )}
      </button>

      {/* Filters panel */}
      {showFilters && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
            <ChipRow options={STATUS_OPTS} value={status} onChange={setStatus} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Brand</p>
            <ChipRow options={BRAND_OPTS} value={brand} onChange={setBrand} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Storage</p>
            <ChipRow options={STORAGE_OPTS} value={storage} onChange={setStorage} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</p>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {modelOpts.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lot</p>
              <select
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Lots</option>
                {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => { setStatus("all"); setBrand("all"); setStorage("all"); setModel("all"); setLotId("all") }}
              className="text-xs text-red-500 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Phone list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : phones.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm font-medium">No phones found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          phones.map((phone) => (
            <Link key={phone.id} href={`/inventory/${phone.id}`}>
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors active:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">
                      {phone.model} · {phone.storage}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{phone.color}</p>
                    <p className="text-xs font-mono text-gray-400 mt-1">{maskIMEI(phone.imei)}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">{phone.condition}</span>
                      {phone.ptaStatus && (
                        <span className="text-xs text-gray-400">· {phone.ptaStatus}</span>
                      )}
                      {phone.batteryHealth && (
                        <span className="text-xs text-gray-400">· 🔋{phone.batteryHealth}%</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{phone.lot.name}</p>
                    {(phone.sellerName || phone.sellerCnic) && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                        {phone.sellerName && (
                          <p className="text-xs text-indigo-600 font-medium">
                            Seller: {phone.sellerName}
                          </p>
                        )}
                        {phone.sellerCnic && (
                          <p className="text-xs text-gray-400 font-mono">
                            CNIC: {phone.sellerCnic}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge className={cn("border-0 text-xs capitalize", STATUS_COLORS[phone.status])}>
                      {phone.status}
                    </Badge>
                    <span className="text-xs font-medium text-gray-700">
                      {formatPKR(Number(phone.costPrice))}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Add Single Phone Dialog */}
      <AddSinglePhoneDialog
        open={addSinglePhoneOpen}
        onOpenChange={setAddSinglePhoneOpen}
        onSuccess={() => {
          setAddSinglePhoneOpen(false)
          // Reload phones
          const params = new URLSearchParams()
          if (debouncedSearch) params.append("search", debouncedSearch)
          if (status !== "all") params.append("status", status)
          if (brand !== "all") params.append("brand", brand)
          if (storage !== "all") params.append("storage", storage)
          if (model !== "all") params.append("model", model)
          if (lotId !== "all") params.append("lotId", lotId)
          fetch(`/api/phones?${params}`).then((r) => r.json()).then(setPhones)
        }}
      />
    </div>
  )
}
