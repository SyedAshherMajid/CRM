"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Package,
  TrendingUp,
  CreditCard,
  DollarSign,
  Plus,
  ShoppingCart,
  Box,
  Clock,
} from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"

interface DashboardData {
  stats: {
    availablePhones: number
    soldThisMonth: number
    owedToSuppliers: number
    pendingFromShops: number
    profitThisMonth: number
    revenueThisMonth: number
    costThisMonth: number
  }
  activity: Array<{
    id: string
    type: string
    timestamp: string
    description: string
    user: string
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/dashboard")
        if (!res.ok) throw new Error("Failed to load dashboard")
        const json = await res.json()
        setData(json)
      } catch (err) {
        toast.error("Failed to load dashboard data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your business at a glance</p>
      </div>

      {/* Top 4 Stats - Grid Layout */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* In Stock */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">
                  {data?.stats.availablePhones}
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">In Stock</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sold This Month */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-700">
                  {data?.stats.soldThisMonth}
                </p>
                <p className="text-xs text-blue-600 mt-1 font-medium">Sold This Month</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* You Owe Suppliers */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {formatPKR(data?.stats.owedToSuppliers || 0)}
                </p>
                <p className="text-xs text-orange-600 mt-1 font-medium">Owe Suppliers</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Shops Owe You */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {formatPKR(data?.stats.pendingFromShops || 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1 font-medium">Shops Owe You</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profit Card - Large & Prominent */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
        <Card className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-0">
          <CardContent className="pt-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                <p className="text-sm font-medium opacity-90">This Month&apos;s Profit (10-10 Cycle)</p>
              </div>
              <p className="text-4xl font-bold">{formatPKR(data?.stats.profitThisMonth || 0)}</p>
              <div className="flex gap-6 text-sm opacity-90">
                <div>
                  <p className="opacity-75 text-xs">Revenue</p>
                  <p className="font-semibold">{formatPKR(data?.stats.revenueThisMonth || 0)}</p>
                </div>
                <div>
                  <p className="opacity-75 text-xs">Cost</p>
                  <p className="font-semibold">{formatPKR(data?.stats.costThisMonth || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Action Buttons - Full Width */}
      <div className="space-y-2">
        <Link href="/lots/new" className="block">
          <Button className="w-full h-12 text-base font-medium" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            New Purchase Lot
          </Button>
        </Link>
        <Link href="/sales" className="block">
          <Button className="w-full h-12 text-base font-medium" variant="outline" size="lg">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Record Sale
          </Button>
        </Link>
        <Link href="/inventory" className="block">
          <Button className="w-full h-12 text-base font-medium" variant="outline" size="lg">
            <Box className="w-5 h-5 mr-2" />
            View Inventory
          </Button>
        </Link>
        <Link href="/reports" className="block">
          <Button className="w-full h-12 text-base font-medium" variant="outline" size="lg">
            <TrendingUp className="w-5 h-5 mr-2" />
            View Reports
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-4 mt-6">
          <Clock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : data?.activity && data.activity.length > 0 ? (
          <div className="space-y-2">
            {data.activity.map((item) => (
              <Card key={item.id} className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                      item.type === "phone_added"
                        ? "bg-blue-100"
                        : item.type === "sale"
                          ? "bg-green-100"
                          : "bg-purple-100"
                    )}
                  >
                    {item.type === "phone_added" ? (
                      <Box className="w-5 h-5 text-blue-600" />
                    ) : item.type === "sale" ? (
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-purple-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      by {item.user} • {formatTimeAgo(new Date(item.timestamp))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No recent activity</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return date.toLocaleDateString()
}
