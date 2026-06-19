"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { TrendingUp, CreditCard, DollarSign, Box, ShoppingCart } from "lucide-react"

interface Sale {
  phoneModel: string
  brand: string
  shopBuyerName?: string
  customerName?: string
  sellingPrice: string
  costPrice: string
  profit: string
  soldAt: string
}

interface ReportData {
  monthLabel: string
  stats: {
    totalPhonesPurchased: number
    totalPurchaseCost: number
    totalPhonesSold: number
    totalSaleRevenue: number
    totalProfit: number
    averageProfitPerPhone: number
  }
  budgeting: {
    totalOwedToSuppliers: number
    totalPendingFromShops: number
    lotsCreated: number
    salesCount: number
  }
  sales: Sale[]
  shopDetails: Array<{ name: string; amountOwed: string; salesCount: number }>
}

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState<"month" | "all">("month")
  const [months, setMonths] = useState<Array<{ label: string; value: string }>>([])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailModal, setDetailModal] = useState<{
    open: boolean
    type?: "profit" | "shops"
    title?: string
    data?: Sale[] | Array<{ name: string; amountOwed: string; salesCount: number }>
  }>({
    open: false,
  })

  // Generate months
  useEffect(() => {
    const generateMonths = async () => {
      const monthsList = []
      const today = new Date()

      for (let i = 0; i < 12; i++) {
        const date = new Date(today)
        date.setMonth(date.getMonth() - i)

        const dateStr = date.toISOString().split("T")[0]
        const year = date.getFullYear()
        const month = date.getMonth()

        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ]
        const currentMonth = monthNames[month]
        const nextMonth = monthNames[(month + 1) % 12]

        monthsList.push({
          label: `${currentMonth} 10 - ${nextMonth} 9, ${i === 0 ? "Current" : year}`,
          value: dateStr,
        })
      }

      setMonths(monthsList)
      if (monthsList.length > 0) {
        setSelectedMonth(monthsList[0].value)
      }
    }

    generateMonths()
  }, [])

  // Load report data
  useEffect(() => {
    if (!selectedMonth && timeframe === "month") return

    async function loadReport() {
      try {
        setLoading(true)
        const url =
          timeframe === "all"
            ? `/api/reports?timeframe=all`
            : `/api/reports?date=${selectedMonth}&timeframe=month`
        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed to load report")
        const json = await res.json()
        setData(json)
      } catch (err) {
        toast.error("Failed to load report data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [selectedMonth, timeframe])

  if (!data && !loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Budgeting</h1>
        <p className="text-gray-500">Select a timeframe to view reports</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Budgeting</h1>
          <p className="text-sm text-gray-500 mt-1">10th to 10th accounting cycle</p>
        </div>

        {/* Timeframe Toggle */}
        <div className="flex gap-2">
          <Button
            variant={timeframe === "month" ? "default" : "outline"}
            onClick={() => setTimeframe("month")}
          >
            This Month
          </Button>
          <Button
            variant={timeframe === "all" ? "default" : "outline"}
            onClick={() => setTimeframe("all")}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Month Selector (only for month view) */}
      {timeframe === "month" && (
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full md:w-80 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Period Label */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Reporting Period:</span> {data.monthLabel}
            </p>
          </div>

          {/* Main Stats Grid - Clickable */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Phones Purchased */}
            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
              <CardContent className="pt-6">
                <Box className="w-5 h-5 text-cyan-600 mb-2" />
                <p className="text-3xl font-bold text-cyan-700">{data.stats.totalPhonesPurchased}</p>
                <p className="text-xs text-cyan-600 mt-1 font-medium">Phones Purchased</p>
                <p className="text-xs text-cyan-500 mt-1">
                  Cost: {data.stats.totalPurchaseCost}
                </p>
              </CardContent>
            </Card>

            {/* Phones Sold */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="pt-6">
                <ShoppingCart className="w-5 h-5 text-emerald-600 mb-2" />
                <p className="text-3xl font-bold text-emerald-700">{data.stats.totalPhonesSold}</p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">Phones Sold</p>
                <p className="text-xs text-emerald-500 mt-1">
                  Revenue: {data.stats.totalSaleRevenue}
                </p>
              </CardContent>
            </Card>

            {/* Total Profit - Clickable */}
            <Card
              className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-md transition"
              onClick={() =>
                setDetailModal({
                  open: true,
                  type: "profit",
                  title: "Profit Details",
                  data: data.sales,
                })
              }
            >
              <CardContent className="pt-6">
                <TrendingUp className="w-5 h-5 text-green-600 mb-2" />
                <p className="text-3xl font-bold text-green-700">{data.stats.totalProfit}</p>
                <p className="text-xs text-green-600 mt-1 font-medium">Total Profit</p>
                <p className="text-xs text-green-500 mt-1">Click to see details</p>
              </CardContent>
            </Card>

            {/* Owed to Suppliers */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="pt-6">
                <CreditCard className="w-5 h-5 text-orange-600 mb-2" />
                <p className="text-2xl font-bold text-orange-700">
                  {data.budgeting.totalOwedToSuppliers}
                </p>
                <p className="text-xs text-orange-600 mt-1 font-medium">Owe Suppliers</p>
                <p className="text-xs text-orange-500 mt-1">Lots: {data.budgeting.lotsCreated}</p>
              </CardContent>
            </Card>

            {/* Pending from Shops - Clickable */}
            <Card
              className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-md transition"
              onClick={() =>
                setDetailModal({
                  open: true,
                  type: "shops",
                  title: "Shop Details",
                  data: data.shopDetails,
                })
              }
            >
              <CardContent className="pt-6">
                <DollarSign className="w-5 h-5 text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-purple-700">
                  {data.budgeting.totalPendingFromShops}
                </p>
                <p className="text-xs text-purple-600 mt-1 font-medium">Shops Owe You</p>
                <p className="text-xs text-purple-500 mt-1">Click to see details</p>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-indigo-600">Revenue</span>
                    <span className="font-semibold text-indigo-700">
                      {data.stats.totalSaleRevenue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-600">Cost</span>
                    <span className="font-semibold text-indigo-700">
                      {data.stats.totalPurchaseCost}
                    </span>
                  </div>
                  <div className="border-t border-indigo-200 pt-2 flex justify-between">
                    <span className="text-indigo-600 font-medium">Net Profit</span>
                    <span className="font-bold text-indigo-700">
                      {data.stats.totalProfit}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {/* Detail Modal */}
      <Dialog open={detailModal.open} onOpenChange={(open) => setDetailModal({ ...detailModal, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailModal.title}</DialogTitle>
            <DialogDescription>
              {detailModal.type === "profit"
                ? "Breakdown of all sales and profits this period"
                : "Breakdown of shop buyers and their outstanding balances"}
            </DialogDescription>
          </DialogHeader>

          {detailModal.type === "profit" && Array.isArray(detailModal.data) && (detailModal.data as Sale[]).length > 0 ? (
            <div className="space-y-3">
              {(detailModal.data as Sale[]).map((sale, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-semibold">{sale.phoneModel}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Buyer</p>
                      <p className="font-semibold">{sale.shopBuyerName || sale.customerName || "Walk-in"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cost</p>
                      <p className="font-semibold">{sale.costPrice}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Selling Price</p>
                      <p className="font-semibold">{sale.sellingPrice}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Profit</p>
                      <p className="font-semibold text-green-600">{sale.profit}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date Sold</p>
                      <p className="font-semibold">{sale.soldAt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : detailModal.type === "shops" && Array.isArray(detailModal.data) ? (
            <div className="space-y-3">
              {(detailModal.data as Array<{ name: string; amountOwed: string; salesCount: number }>).map(
                (shop, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Shop Name</p>
                        <p className="font-semibold">{shop.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount Owed</p>
                        <p className="font-semibold text-orange-600">{shop.amountOwed}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sales Count</p>
                        <p className="font-semibold">{shop.salesCount}</p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-gray-500">No details available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
