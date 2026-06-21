"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, ShoppingBag, Search, ChevronRight } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"

interface Lot {
  id: string
  name: string
  totalAmount: string
  amountPaid: string
  createdAt: string
  supplier: { name: string } | null
  _count: { phones: number }
  availableCount: number
  soldCount: number
}

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/lots")
      .then((r) => r.json())
      .then((data) => { setLots(data); setLoading(false) })
  }, [])

  const filtered = lots.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.supplier?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchase Lots</h1>
          <p className="text-sm text-gray-500 mt-0.5">All bulk phone purchases</p>
        </div>
        <Link href="/lots/new">
          <Button className="h-10">
            <Plus className="w-4 h-4 mr-1" /> New Lot
          </Button>
        </Link>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by lot name or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{lots.length === 0 ? "No lots yet" : "No results found"}</p>
          {lots.length === 0 && (
            <Link href="/lots/new">
              <Button className="mt-4">Create First Lot</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lot) => {
            const total = Number(lot.totalAmount)
            const paid = Number(lot.amountPaid)
            const remaining = total - paid
            const pct = total > 0 ? Math.round((paid / total) * 100) : 0
            const available = lot.availableCount
            const sold = lot.soldCount

            return (
              <Link key={lot.id} href={`/lots/${lot.id}`}>
                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{lot.name}</p>
                        {lot.supplier && (
                          <p className="text-sm text-gray-500 mt-0.5">{lot.supplier.name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{lot._count.phones} phones</Badge>
                          <span className="text-xs text-green-600 font-medium">{sold} sold</span>
                          <span className="text-xs text-gray-400">{available} left</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {remaining === 0 ? (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">Paid</Badge>
                        ) : paid === 0 ? (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">Unpaid</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Partial</Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Payment bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Paid: {formatPKR(paid)}</span>
                        <span>Total: {formatPKR(total)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {remaining > 0 && (
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          Remaining: {formatPKR(remaining)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
