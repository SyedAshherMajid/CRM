import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { get1010MonthRange } from "@/lib/utils/month-cycle"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get current 10-10 month range (10th to 10th)
    const { start: monthStart, end: monthEnd } = get1010MonthRange()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // All 9 queries fired in parallel — total wait = slowest single query, not sum of all
    const [
      availableCount,
      soldThisMonth,
      supplierOwing,
      supplierDirectPayments,
      shopOwing,
      salesThisMonth,
      recentPhones,
      recentSales,
      recentPayments,
    ] = await Promise.all([
      // 1. Available phones count
      db.phone.count({
        where: { status: "available" },
      }),

      // 2. Phones sold this month
      db.sale.count({
        where: { soldAt: { gte: monthStart, lte: monthEnd } },
      }),

      // 3. Lot totals for supplier owing base
      db.purchaseLot.aggregate({
        _sum: { totalAmount: true, amountPaid: true },
      }),

      // 4. Supplier-level direct payments (not tied to a specific lot)
      db.supplierPayment.aggregate({
        _sum: { amount: true },
      }),

      // 5. Pending from shops (shop-type sales only)
      db.sale.aggregate({
        where: { saleType: "shop" },
        _sum: { sellingPrice: true, amountReceived: true },
      }),

      // 5. Sales this month for profit calculation
      db.sale.findMany({
        where: { soldAt: { gte: monthStart, lte: monthEnd } },
        select: {
          sellingPrice: true,
          phone: { select: { costPrice: true } },
        },
      }),

      // 6. Recent phones added (activity feed)
      db.phone.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          createdAt: true,
          model: true,
          imei: true,
          adder: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // 7. Recent sales (activity feed)
      db.sale.findMany({
        where: { soldAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          soldAt: true,
          phone: { select: { model: true } },
          customerName: true,
          shopBuyer: { select: { name: true } },
          seller: { select: { name: true } },
        },
        orderBy: { soldAt: "desc" },
        take: 10,
      }),

      // 8. Recent payments (activity feed)
      db.salePayment.findMany({
        where: { receivedAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          receivedAt: true,
          amount: true,
          sale: {
            select: {
              phone: { select: { model: true } },
              shopBuyer: { select: { name: true } },
              customerName: true,
            },
          },
          recorder: { select: { name: true } },
        },
        orderBy: { receivedAt: "desc" },
        take: 5,
      }),
    ])

    // Calculate profit from the results
    const revenueThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.sellingPrice), 0)
    const costThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.phone.costPrice), 0)
    const profitThisMonth = revenueThisMonth - costThisMonth

    const totalOwedToSuppliers = Math.max(
      0,
      (supplierOwing._sum.totalAmount?.toNumber() || 0) -
      (supplierOwing._sum.amountPaid?.toNumber() || 0) -
      (supplierDirectPayments._sum.amount?.toNumber() || 0)
    )

    const totalPendingFromShops =
      (shopOwing._sum.sellingPrice?.toNumber() || 0) - (shopOwing._sum.amountReceived?.toNumber() || 0)

    // Merge and sort activity feed
    const activity = [
      ...recentPhones.map((p) => ({
        id: p.id,
        type: "phone_added",
        timestamp: p.createdAt,
        description: `Added ${p.model}`,
        user: p.adder.name,
      })),
      ...recentSales.map((s) => ({
        id: s.id,
        type: "sale",
        timestamp: s.soldAt,
        description: `Sold ${s.phone.model}`,
        user: s.seller.name,
      })),
      ...recentPayments.map((p) => ({
        id: p.id,
        type: "payment",
        timestamp: p.receivedAt,
        description: `Payment received`,
        user: p.recorder.name,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)

    const response = NextResponse.json({
      stats: {
        availablePhones: availableCount,
        soldThisMonth,
        owedToSuppliers: totalOwedToSuppliers,
        pendingFromShops: totalPendingFromShops,
        profitThisMonth,
        revenueThisMonth,
        costThisMonth,
      },
      activity,
    })

    // private = don't cache in CDN (personal business data)
    // max-age=0 = always revalidate
    // stale-while-revalidate=30 = serve stale data instantly while fetching fresh in background
    // Effect: dashboard navigations feel instant even during cold starts
    response.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=30")
    return response
  } catch (err) {
    console.error("[GET /api/dashboard]", err)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
