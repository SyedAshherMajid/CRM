"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Package, Store, User, Truck, AlertTriangle, ChevronRight, RefreshCw } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { maskIMEI } from "@/lib/utils/imei"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockPhone {
  id: string; brand: string; model: string; storage: string
  color: string; imei: string; condition: string; costPrice: number; lotName: string
}
interface DefectivePhone {
  id: string; brand: string; model: string; storage: string
  color: string; imei: string; costPrice: number; notes: string | null; lotName: string
}
interface CurrentStats {
  stock: { count: number; totalCostValue: number; avgCostPrice: number; phones: StockPhone[] }
  defective: { count: number; totalCostValue: number; phones: DefectivePhone[] }
  returned: { count: number; totalCostValue: number }
  shopOwing: {
    total: number; shopsCount: number
    shops: Array<{ name: string; outstanding: number; pendingCount: number; totalSales: number }>
  }
  customerOwing: {
    total: number; customersCount: number
    customers: Array<{ name: string; outstanding: number; pendingCount: number; totalSales: number }>
  }
  supplierDebt: {
    total: number; suppliersCount: number
    suppliers: Array<{ name: string; totalOwed: number; lotDebt: number; directPaid: number; lots: Array<{ name: string; owed: number }> }>
  }
  netPosition: number
  totalReceivables: number
}

type ModalType = "stock" | "shops" | "customers" | "suppliers" | "defective"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [cs, setCs] = useState<CurrentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; type?: ModalType; title?: string }>({ open: false })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/current-stats")
      if (res.ok) setCs(await res.json())
      else throw new Error()
    } catch {
      toast.error("Failed to load stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function open(type: ModalType, title: string) {
    setModal({ open: true, type, title })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Current Stats</h1>
          <p className="text-xs text-gray-400 mt-0.5">Live snapshot of your business right now</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : cs ? (
        <>
          {/* Cards grid */}
          <div className="grid grid-cols-2 gap-3">

            {/* Stock value */}
            <StatCard
              color="teal"
              icon={<Package className="w-5 h-5 text-teal-600 mb-1" />}
              main={formatPKR(cs.stock.totalCostValue)}
              label={`${cs.stock.count} Phones in Stock`}
              sub="Tap to see all phones"
              onClick={() => open("stock", "Phones in Stock")}
            />

            {/* Shops owe */}
            <StatCard
              color="purple"
              icon={<Store className="w-5 h-5 text-purple-600 mb-1" />}
              main={formatPKR(cs.shopOwing.total)}
              label="Shops Owe You"
              sub={`${cs.shopOwing.shopsCount} shop${cs.shopOwing.shopsCount !== 1 ? "s" : ""} with balance`}
              onClick={() => open("shops", "Shop Buyers — Outstanding")}
            />

            {/* Customers owe */}
            <StatCard
              color="blue"
              icon={<User className="w-5 h-5 text-blue-600 mb-1" />}
              main={formatPKR(cs.customerOwing.total)}
              label="Customers Owe You"
              sub={`${cs.customerOwing.customersCount} customer${cs.customerOwing.customersCount !== 1 ? "s" : ""} with balance`}
              onClick={() => open("customers", "Customers — Outstanding")}
            />

            {/* Supplier debt */}
            <StatCard
              color="orange"
              icon={<Truck className="w-5 h-5 text-orange-600 mb-1" />}
              main={formatPKR(cs.supplierDebt.total)}
              label="You Owe Suppliers"
              sub={`${cs.supplierDebt.suppliersCount} supplier${cs.supplierDebt.suppliersCount !== 1 ? "s" : ""} with balance`}
              onClick={() => open("suppliers", "Supplier Debt — Breakdown")}
            />

            {/* Defective */}
            <StatCard
              color="red"
              icon={<AlertTriangle className="w-5 h-5 text-red-600 mb-1" />}
              main={String(cs.defective.count)}
              label="Defective Phones"
              sub={`Cost: ${formatPKR(cs.defective.totalCostValue)}`}
              onClick={cs.defective.count > 0 ? () => open("defective", "Defective Phones") : undefined}
            />

            {/* Returned — info only */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col justify-between">
              <Package className="w-5 h-5 text-gray-300 mb-1" />
              <p className="text-xl font-bold text-gray-700">{cs.returned.count}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">Returned Phones</p>
              <p className="text-xs text-gray-400 mt-1">
                {cs.returned.count > 0 ? `Cost: ${formatPKR(cs.returned.totalCostValue)}` : "None returned"}
              </p>
            </div>

          </div>
        </>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Failed to load. Try refreshing.</p>
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={modal.open} onOpenChange={(v) => setModal({ ...modal, open: v })}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[88vh] p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b flex-shrink-0">
            <DialogTitle>{modal.title}</DialogTitle>
            <DialogDescription className="sr-only">Detail view</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {cs && modal.type === "stock"     && <StockModal     phones={cs.stock.phones} total={cs.stock.totalCostValue} />}
            {cs && modal.type === "shops"     && <ShopsModal     shops={cs.shopOwing.shops} total={cs.shopOwing.total} />}
            {cs && modal.type === "customers" && <CustomersModal customers={cs.customerOwing.customers} total={cs.customerOwing.total} />}
            {cs && modal.type === "suppliers" && <SuppliersModal suppliers={cs.supplierDebt.suppliers} total={cs.supplierDebt.total} />}
            {cs && modal.type === "defective" && <DefectiveModal phones={cs.defective.phones} total={cs.defective.totalCostValue} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { card: string; text: string; sub: string }> = {
  teal:   { card: "bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200",       text: "text-teal-700",    sub: "text-teal-500"   },
  purple: { card: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200", text: "text-purple-700",  sub: "text-purple-500" },
  blue:   { card: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",       text: "text-blue-700",    sub: "text-blue-500"   },
  orange: { card: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200", text: "text-orange-700",  sub: "text-orange-500" },
  red:    { card: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",          text: "text-red-700",     sub: "text-red-500"    },
}

function StatCard({ color, icon, main, label, sub, onClick }: {
  color: string; icon: React.ReactNode; main: string; label: string; sub: string; onClick?: () => void
}) {
  const c = COLOR_MAP[color]
  return (
    <Card
      className={cn("border transition select-none", c.card, onClick && "cursor-pointer hover:shadow-md")}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3 px-4 flex flex-col h-full justify-between">
        <div>
          {icon}
          <p className={cn("text-xl font-bold leading-tight", c.text)}>{main}</p>
          <p className={cn("text-xs font-medium mt-0.5", c.text)}>{label}</p>
        </div>
        <p className={cn("text-xs mt-2 flex items-center gap-0.5", c.sub)}>
          {sub} {onClick && <ChevronRight className="w-3 h-3" />}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Modal content components ─────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return <p className="text-center text-gray-400 py-8 text-sm">{text}</p>
}

function StockModal({ phones, total }: { phones: StockPhone[]; total: number }) {
  if (!phones.length) return <Empty text="No phones in stock" />
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm font-semibold text-gray-700 border-b pb-3">
        <span>{phones.length} phones available</span>
        <span className="text-teal-700">{formatPKR(total)}</span>
      </div>

      {/* Flat list — every individual phone */}
      {phones.map((p) => (
        <div key={p.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 leading-tight">{p.model}</p>
            <p className="text-xs text-gray-500 mt-0.5">{p.storage} · {p.color} · {p.condition}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{maskIMEI(p.imei)}</p>
            <p className="text-xs text-gray-400 truncate">{p.lotName}</p>
          </div>
          <p className="text-sm font-bold text-teal-700 flex-shrink-0">{formatPKR(p.costPrice)}</p>
        </div>
      ))}
    </div>
  )
}

function ShopsModal({ shops, total }: {
  shops: Array<{ name: string; outstanding: number; pendingCount: number; totalSales: number }>
  total: number
}) {
  const withBalance = shops.filter(s => s.outstanding > 0)
  if (!withBalance.length) return <Empty text="All shop buyers are settled" />
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold text-gray-700 border-b pb-2">
        <span>{withBalance.length} shop{withBalance.length !== 1 ? "s" : ""} with balance</span>
        <span>{formatPKR(total)}</span>
      </div>
      {withBalance.map((shop, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <div>
            <p className="font-medium text-gray-900">{shop.name}</p>
            <p className="text-xs text-gray-400">
              {shop.pendingCount} pending sale{shop.pendingCount !== 1 ? "s" : ""} · {shop.totalSales} total
            </p>
          </div>
          <p className="font-bold text-sm text-purple-700">{formatPKR(shop.outstanding)}</p>
        </div>
      ))}
    </div>
  )
}

function CustomersModal({ customers, total }: {
  customers: Array<{ name: string; outstanding: number; pendingCount: number; totalSales: number }>
  total: number
}) {
  // Only show customers who actually owe money
  const withBalance = customers.filter(c => c.outstanding > 0)
  if (!withBalance.length) return <Empty text="No outstanding customer balances" />
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold text-gray-700 border-b pb-2">
        <span>{withBalance.length} customer{withBalance.length !== 1 ? "s" : ""} with balance</span>
        <span>{formatPKR(total)}</span>
      </div>
      {withBalance.map((c, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <div>
            <p className="font-medium text-gray-900">{c.name}</p>
            <p className="text-xs text-gray-400">
              {c.pendingCount} pending sale{c.pendingCount !== 1 ? "s" : ""} · {c.totalSales} total
            </p>
          </div>
          <p className="font-bold text-sm text-blue-700">{formatPKR(c.outstanding)}</p>
        </div>
      ))}
    </div>
  )
}

function SuppliersModal({ suppliers, total }: {
  suppliers: Array<{ name: string; totalOwed: number; lotDebt: number; directPaid: number; lots: Array<{ name: string; owed: number }> }>
  total: number
}) {
  const withBalance = suppliers.filter(s => s.totalOwed > 0)
  if (!withBalance.length) return <Empty text="No outstanding supplier debt" />
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold text-gray-700 border-b pb-2">
        <span>{withBalance.length} supplier{withBalance.length !== 1 ? "s" : ""} with balance</span>
        <span>{formatPKR(total)}</span>
      </div>
      {withBalance.map((sup, i) => (
        <div key={i} className="border rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <p className="font-semibold text-gray-900">{sup.name}</p>
            <p className="font-bold text-sm text-orange-600">{formatPKR(sup.totalOwed)}</p>
          </div>
          {sup.lots.filter(l => l.owed > 0).length > 0 && (
            <div className="space-y-1 border-t pt-2">
              {sup.lots.filter(l => l.owed > 0).map((lot, j) => (
                <div key={j} className="flex justify-between text-xs text-gray-600">
                  <span>{lot.name}</span>
                  <span className="text-orange-500 font-medium">{formatPKR(lot.owed)}</span>
                </div>
              ))}
              {sup.directPaid > 0 && (
                <div className="flex justify-between text-xs text-green-600 border-t pt-1 mt-1">
                  <span>Direct payments made</span>
                  <span>− {formatPKR(sup.directPaid)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DefectiveModal({ phones, total }: { phones: DefectivePhone[]; total: number }) {
  if (!phones.length) return <Empty text="No defective phones" />
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold text-gray-700 border-b pb-2">
        <span>{phones.length} defective phone{phones.length !== 1 ? "s" : ""}</span>
        <span className="text-red-600">{formatPKR(total)} written off</span>
      </div>
      {phones.map((p, i) => (
        <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{p.model} · {p.storage} · {p.color}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{maskIMEI(p.imei)}</p>
            {p.notes && <p className="text-xs text-red-400 mt-0.5">{p.notes}</p>}
            <p className="text-xs text-gray-400">{p.lotName}</p>
          </div>
          <p className="text-sm font-bold text-red-600 flex-shrink-0">{formatPKR(p.costPrice)}</p>
        </div>
      ))}
    </div>
  )
}
