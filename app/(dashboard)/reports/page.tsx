"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { TrendingUp, TrendingDown, CreditCard, DollarSign, Box, ShoppingCart, Receipt, ChevronRight, Minus } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sale {
  phoneModel: string; brand: string; shopBuyerName?: string | null; customerName?: string | null
  saleType: string; sellingPrice: number; costPrice: number; profit: number; soldAt: string
}
interface ExpenseDetail {
  id: string; amount: number; category: string; description: string
  expenseDate: string; notes: string | null; recordedBy: string
}
interface PurchasedPhone { brand: string; model: string; costPrice: number; lotName: string }
interface SupplierDetail {
  name: string; totalOwed: number; lotsCount: number; lots: Array<{ name: string; owed: number }>
}
interface ReportData {
  monthLabel: string
  stats: {
    totalPhonesPurchased: number; totalPurchaseCost: number
    totalPhonesSold: number; totalSaleRevenue: number
    totalProfit: number; netProfit: number; totalExpenses: number; averageProfitPerPhone: number
  }
  budgeting: { totalOwedToSuppliers: number; totalPendingFromShops: number; lotsCreated: number; salesCount: number }
  sales: Sale[]
  shopDetails: Array<{ name: string; amountOwed: number; salesCount: number }>
  expenseDetails: ExpenseDetail[]
  expenseByCategory: Record<string, number>
  supplierDetails: SupplierDetail[]
  purchasedPhones: PurchasedPhone[]
}
type ModalType = "sold" | "purchased" | "profit" | "expenses" | "suppliers" | "shops" | "netprofit"

const CATEGORY_COLOR: Record<string, string> = {
  Rent: "bg-blue-100 text-blue-700", Electricity: "bg-yellow-100 text-yellow-700",
  Internet: "bg-cyan-100 text-cyan-700", Food: "bg-orange-100 text-orange-700",
  Salary: "bg-purple-100 text-purple-700", Transport: "bg-green-100 text-green-700",
  Other: "bg-gray-100 text-gray-700",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState<"month" | "all">("month")
  const [months, setMonths] = useState<Array<{ label: string; value: string }>>([])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; type?: ModalType; title?: string }>({ open: false })

  useEffect(() => {
    const list: Array<{ label: string; value: string }> = []
    const today = new Date()
    const names = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    for (let i = 0; i < 12; i++) {
      const d = new Date(today); d.setMonth(d.getMonth() - i)
      list.push({
        label: `${names[d.getMonth()]} 10 – ${names[(d.getMonth()+1)%12]} 9, ${i === 0 ? "Current" : d.getFullYear()}`,
        value: d.toISOString().split("T")[0],
      })
    }
    setMonths(list)
    if (list.length > 0) setSelectedMonth(list[0].value)
  }, [])

  useEffect(() => {
    if (!selectedMonth && timeframe === "month") return
    async function load() {
      try {
        setLoading(true)
        const url = timeframe === "all" ? `/api/reports?timeframe=all` : `/api/reports?date=${selectedMonth}&timeframe=month`
        const res = await fetch(url)
        if (!res.ok) throw new Error()
        setData(await res.json())
      } catch { toast.error("Failed to load report data") }
      finally { setLoading(false) }
    }
    load()
  }, [selectedMonth, timeframe])

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Budgeting</h1>
          <p className="text-sm text-gray-500 mt-1">10th–10th accounting cycle · tap any card for details</p>
        </div>
        <div className="flex gap-2">
          <Button variant={timeframe === "month" ? "default" : "outline"} onClick={() => setTimeframe("month")}>This Month</Button>
          <Button variant={timeframe === "all" ? "default" : "outline"} onClick={() => setTimeframe("all")}>All Time</Button>
        </div>
      </div>

      {/* Month selector */}
      {timeframe === "month" && (
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full md:w-80 h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({length:8}).map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : data ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-700"><span className="font-semibold">Period:</span> {data.monthLabel}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ClickableCard color="cyan"
              onClick={() => setModal({ open:true, type:"purchased", title:"Phones Purchased" })}
              icon={<Box className="w-5 h-5 text-cyan-600 mb-1" />}
              main={String(data.stats.totalPhonesPurchased)} label="Phones Purchased"
              sub={`Cost: ${formatPKR(data.stats.totalPurchaseCost)}`} />

            <ClickableCard color="emerald"
              onClick={() => setModal({ open:true, type:"sold", title:"Phones Sold" })}
              icon={<ShoppingCart className="w-5 h-5 text-emerald-600 mb-1" />}
              main={String(data.stats.totalPhonesSold)} label="Phones Sold"
              sub={`Revenue: ${formatPKR(data.stats.totalSaleRevenue)}`} />

            <ClickableCard color="green"
              onClick={() => setModal({ open:true, type:"profit", title:"Gross Profit Breakdown" })}
              icon={<TrendingUp className="w-5 h-5 text-green-600 mb-1" />}
              main={formatPKR(data.stats.totalProfit)} label="Gross Profit"
              sub={`Avg: ${formatPKR(data.stats.averageProfitPerPhone)} / phone`} />

            <ClickableCard color="red"
              onClick={() => setModal({ open:true, type:"expenses", title:"Expenses Breakdown" })}
              icon={<Receipt className="w-5 h-5 text-red-600 mb-1" />}
              main={formatPKR(data.stats.totalExpenses)} label="Total Expenses"
              sub={`${data.expenseDetails.length} entries`} />

            {/* Net Profit — full width */}
            <div
              className={cn("col-span-2 md:col-span-4 rounded-xl border cursor-pointer hover:shadow-md transition select-none",
                data.stats.netProfit >= 0
                  ? "bg-gradient-to-r from-teal-600 to-teal-700 border-teal-700"
                  : "bg-gradient-to-r from-rose-600 to-rose-700 border-rose-700"
              )}
              onClick={() => setModal({ open:true, type:"netprofit", title:"Net Profit Breakdown" })}
            >
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Net Profit</p>
                  <p className="text-3xl font-bold text-white mt-0.5">{formatPKR(data.stats.netProfit)}</p>
                  <p className="text-xs text-white/60 mt-1">
                    Gross {formatPKR(data.stats.totalProfit)} − Expenses {formatPKR(data.stats.totalExpenses)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {data.stats.netProfit >= 0
                    ? <TrendingUp className="w-8 h-8 text-white/40" />
                    : <TrendingDown className="w-8 h-8 text-white/40" />}
                  <p className="text-xs text-white/50">tap for details</p>
                </div>
              </div>
            </div>

            <ClickableCard color="orange"
              onClick={() => setModal({ open:true, type:"suppliers", title:"Amount Owed to Suppliers" })}
              icon={<CreditCard className="w-5 h-5 text-orange-600 mb-1" />}
              main={formatPKR(data.budgeting.totalOwedToSuppliers)} label="Owe Suppliers"
              sub={`${data.budgeting.lotsCreated} lots this period`} />

            <ClickableCard color="purple"
              onClick={() => setModal({ open:true, type:"shops", title:"Shops That Owe You" })}
              icon={<DollarSign className="w-5 h-5 text-purple-600 mb-1" />}
              main={formatPKR(data.budgeting.totalPendingFromShops)} label="Shops Owe You"
              sub={`${data.shopDetails.length} shops`} />
          </div>
        </>
      ) : null}

      {/* Detail modal */}
      <Dialog open={modal.open} onOpenChange={(v) => setModal({ ...modal, open: v })}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[88vh] p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b flex-shrink-0">
            <DialogTitle>{modal.title}</DialogTitle>
            <DialogDescription className="sr-only">Details</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {data && modal.type === "purchased" && <PurchasedModal phones={data.purchasedPhones} />}
            {data && modal.type === "sold" && <SoldModal sales={data.sales} />}
            {data && modal.type === "profit" && <ProfitModal sales={data.sales} totalRevenue={data.stats.totalSaleRevenue} totalProfit={data.stats.totalProfit} />}
            {data && modal.type === "expenses" && <ExpensesModal details={data.expenseDetails} byCategory={data.expenseByCategory} total={data.stats.totalExpenses} />}
            {data && modal.type === "netprofit" && <NetProfitModal stats={data.stats} byCategory={data.expenseByCategory} />}
            {data && modal.type === "suppliers" && <SuppliersModal suppliers={data.supplierDetails} />}
            {data && modal.type === "shops" && <ShopsModal shops={data.shopDetails} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Shared card ──────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { card: string; text: string; sub: string }> = {
  cyan:    { card: "bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200",       text: "text-cyan-700",    sub: "text-cyan-500"    },
  emerald: { card: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200", text: "text-emerald-700", sub: "text-emerald-500" },
  green:   { card: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",    text: "text-green-700",   sub: "text-green-500"   },
  red:     { card: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",          text: "text-red-700",     sub: "text-red-500"     },
  orange:  { card: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200", text: "text-orange-700",  sub: "text-orange-500"  },
  purple:  { card: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200", text: "text-purple-700",  sub: "text-purple-500"  },
}

function ClickableCard({ color, onClick, icon, main, label, sub }: {
  color: string; onClick: () => void; icon: React.ReactNode; main: string; label: string; sub: string
}) {
  const c = COLOR_MAP[color]
  return (
    <Card className={cn("border cursor-pointer hover:shadow-md transition select-none", c.card)} onClick={onClick}>
      <CardContent className="pt-4 pb-3 px-4">
        {icon}
        <p className={cn("text-xl font-bold leading-tight", c.text)}>{main}</p>
        <p className={cn("text-xs font-medium mt-0.5", c.text)}>{label}</p>
        <p className={cn("text-xs mt-1", c.sub)}>{sub}</p>
        <p className={cn("text-xs mt-1 flex items-center gap-0.5", c.sub)}>tap for details <ChevronRight className="w-3 h-3" /></p>
      </CardContent>
    </Card>
  )
}

// ─── Modal content ────────────────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return <p className="text-center text-gray-400 py-8 text-sm">{text}</p>
}

function PurchasedModal({ phones }: { phones: PurchasedPhone[] }) {
  if (!phones.length) return <Empty text="No phones purchased this period" />
  const total = phones.reduce((s,p) => s + p.costPrice, 0)
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-medium text-gray-700 border-b pb-2">
        <span>{phones.length} phones</span><span>Total: {formatPKR(total)}</span>
      </div>
      {phones.map((p, i) => (
        <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-900">{p.model}</p>
            <p className="text-xs text-gray-400">{p.brand} · {p.lotName}</p>
          </div>
          <p className="text-sm font-bold text-gray-800">{formatPKR(p.costPrice)}</p>
        </div>
      ))}
    </div>
  )
}

function SoldModal({ sales }: { sales: Sale[] }) {
  if (!sales.length) return <Empty text="No phones sold this period" />
  const totalRev = sales.reduce((s,x) => s + x.sellingPrice, 0)
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-medium text-gray-700 border-b pb-2">
        <span>{sales.length} sales</span><span>Revenue: {formatPKR(totalRev)}</span>
      </div>
      {sales.map((s, i) => (
        <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-900">{s.phoneModel}</p>
            <p className="text-xs text-gray-400">{s.shopBuyerName ?? s.customerName ?? "Walk-in"} · {s.soldAt}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{formatPKR(s.sellingPrice)}</p>
            <Badge className={cn("text-xs border-0", s.saleType === "shop" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>{s.saleType}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProfitModal({ sales, totalRevenue, totalProfit }: { sales: Sale[]; totalRevenue: number; totalProfit: number }) {
  if (!sales.length) return <Empty text="No sales this period" />
  const profitFromSales = sales.reduce((s,x) => s + x.profit, 0)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-3 mb-4">
        <div><p className="text-xs text-gray-500">Revenue</p><p className="text-sm font-bold">{formatPKR(totalRevenue)}</p></div>
        <div><p className="text-xs text-gray-500">Cost</p><p className="text-sm font-bold">{formatPKR(totalRevenue - totalProfit)}</p></div>
        <div><p className="text-xs text-gray-500">Gross Profit</p><p className="text-sm font-bold text-green-700">{formatPKR(profitFromSales)}</p></div>
      </div>
      {sales.map((s, i) => (
        <div key={i} className="py-2 border-b border-gray-100 last:border-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-900">{s.phoneModel}</p>
              <p className="text-xs text-gray-400">{s.shopBuyerName ?? s.customerName ?? "Walk-in"} · {s.soldAt}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{formatPKR(s.costPrice)} cost</p>
              <p className="text-sm font-bold text-gray-800">{formatPKR(s.sellingPrice)}</p>
              <p className={cn("text-xs font-semibold", s.profit >= 0 ? "text-green-600" : "text-red-600")}>
                {s.profit >= 0 ? "+" : ""}{formatPKR(s.profit)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ExpensesModal({ details, byCategory, total }: { details: ExpenseDetail[]; byCategory: Record<string, number>; total: number }) {
  if (!details.length) return <Empty text="No expenses this period" />
  const cats = Object.entries(byCategory).sort((a,b) => b[1]-a[1])
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">By Category</p>
        {cats.map(([cat, amt]) => (
          <div key={cat} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs border-0 font-medium", CATEGORY_COLOR[cat] ?? "bg-gray-100 text-gray-700")}>{cat}</Badge>
              <div className="h-1.5 bg-red-100 rounded-full w-24 overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.round((amt/total)*100)}%` }} />
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-800">{formatPKR(amt)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-bold text-sm text-red-700"><span>Total</span><span>{formatPKR(total)}</span></div>
      </div>
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Entries</p>
        {details.map((e) => (
          <div key={e.id} className="flex items-start justify-between py-1.5 border-b border-gray-100 last:border-0">
            <div>
              <div className="flex items-center gap-1.5">
                <Badge className={cn("text-xs border-0", CATEGORY_COLOR[e.category] ?? "bg-gray-100 text-gray-700")}>{e.category}</Badge>
                <span className="text-xs text-gray-400">{e.expenseDate}</span>
              </div>
              <p className="text-sm text-gray-800 mt-0.5">{e.description}</p>
              {e.notes && <p className="text-xs text-gray-400">{e.notes}</p>}
              <p className="text-xs text-gray-400">by {e.recordedBy}</p>
            </div>
            <p className="text-sm font-bold text-gray-800 ml-3">{formatPKR(e.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function NetProfitModal({ stats, byCategory }: { stats: ReportData["stats"]; byCategory: Record<string, number> }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Total Revenue</span><span className="font-semibold">{formatPKR(stats.totalSaleRevenue)}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Cost of Phones Sold</span>
          <span className="font-semibold text-red-600">− {formatPKR(stats.totalSaleRevenue - stats.totalProfit)}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-200 font-medium">
          <span className="text-gray-700">Gross Profit</span>
          <span className={cn("font-bold", stats.totalProfit >= 0 ? "text-green-700" : "text-red-700")}>{formatPKR(stats.totalProfit)}</span>
        </div>
        {Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => (
          <div key={cat} className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="flex items-center gap-2"><Minus className="w-3 h-3 text-red-400" /><span className="text-gray-600">{cat}</span></span>
            <span className="font-semibold text-red-600">− {formatPKR(amt)}</span>
          </div>
        ))}
        <div className={cn("flex justify-between py-3 rounded-lg px-3 font-bold text-base", stats.netProfit >= 0 ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700")}>
          <span>Net Profit</span><span>{formatPKR(stats.netProfit)}</span>
        </div>
      </div>
      {stats.totalExpenses > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Expenses are {Math.round((stats.totalExpenses / Math.max(stats.totalSaleRevenue, 1)) * 100)}% of revenue
        </p>
      )}
    </div>
  )
}

function SuppliersModal({ suppliers }: { suppliers: SupplierDetail[] }) {
  if (!suppliers.length) return <Empty text="No supplier lots this period" />
  const total = suppliers.reduce((s,x) => s + x.totalOwed, 0)
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold border-b pb-2 text-gray-700">
        <span>{suppliers.length} suppliers</span><span>Total: {formatPKR(total)}</span>
      </div>
      {suppliers.map((sup, i) => (
        <div key={i} className="border rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <div><p className="font-semibold text-gray-900">{sup.name}</p><p className="text-xs text-gray-400">{sup.lotsCount} lot{sup.lotsCount!==1?"s":""}</p></div>
            <p className={cn("font-bold text-sm", sup.totalOwed > 0 ? "text-orange-600" : "text-green-600")}>
              {sup.totalOwed > 0 ? formatPKR(sup.totalOwed) : "Settled"}
            </p>
          </div>
          {sup.lots.length > 0 && (
            <div className="space-y-1 border-t pt-2">
              {sup.lots.map((lot, j) => (
                <div key={j} className="flex justify-between text-xs text-gray-600">
                  <span>{lot.name}</span>
                  <span className={lot.owed > 0 ? "text-orange-500" : "text-green-500"}>{lot.owed > 0 ? formatPKR(lot.owed) : "Paid"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ShopsModal({ shops }: { shops: Array<{ name: string; amountOwed: number; salesCount: number }> }) {
  if (!shops.length) return <Empty text="No outstanding shop balances this period" />
  const total = shops.reduce((s,x) => s + x.amountOwed, 0)
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-semibold border-b pb-2 text-gray-700">
        <span>{shops.length} shops</span><span>Total: {formatPKR(total)}</span>
      </div>
      {shops.map((shop, i) => (
        <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
          <div>
            <p className="font-medium text-gray-900">{shop.name}</p>
            <p className="text-xs text-gray-400">{shop.salesCount} sale{shop.salesCount!==1?"s":""}</p>
          </div>
          <p className={cn("font-bold text-sm", shop.amountOwed > 0 ? "text-purple-700" : "text-green-600")}>
            {shop.amountOwed > 0 ? formatPKR(shop.amountOwed) : "Settled"}
          </p>
        </div>
      ))}
    </div>
  )
}
