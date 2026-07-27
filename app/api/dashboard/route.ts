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

    // All queries fired in parallel — total wait = slowest single query, not sum of all
    const [
      availableCount,
      soldThisMonth,
      supplierOwing,
      supplierDirectPayments,
      shopOwing,
      shopPriorBalOwing,
      salesThisMonth,
      recentPhones,
      recentSales,
      recentPayments,
      availableStockAgg,
      customerSaleAgg,
      directProfitAgg,
      accessoryLotOwing,
      accessoryShopOwing,
      accessorySalesThisMonth,
    ] = await Promise.all([
      // 1. Available phones count
      db.phone.count({ where: { status: "available" } }),

      // 2. Phones sold this month
      db.sale.count({ where: { soldAt: { gte: monthStart, lte: monthEnd } } }),

      // 3. Lot totals for supplier owing base
      db.purchaseLot.aggregate({ _sum: { totalAmount: true, amountPaid: true } }),

      // 4. Supplier-level direct payments (not tied to a specific lot)
      db.supplierPayment.aggregate({ _sum: { amount: true } }),

      // 5. Pending from shops (phone sales)
      db.sale.aggregate({
        where: { saleType: "shop" },
        _sum: { sellingPrice: true, amountReceived: true },
      }),

      // 5b. Prior balance outstanding from shops
      db.shopPriorBalance.aggregate({ _sum: { amount: true, amountPaid: true } }),

      // 6. Phone sales this month for profit calculation
      db.sale.findMany({
        where: { soldAt: { gte: monthStart, lte: monthEnd } },
        select: { sellingPrice: true, phone: { select: { costPrice: true } } },
      }),

      // Recent phones added (activity feed)
      db.phone.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, createdAt: true, model: true, imei: true, adder: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Recent sales (activity feed)
      db.sale.findMany({
        where: { soldAt: { gte: thirtyDaysAgo } },
        select: {
          id: true, soldAt: true,
          phone: { select: { model: true } },
          customerName: true,
          shopBuyer: { select: { name: true } },
          seller: { select: { name: true } },
        },
        orderBy: { soldAt: "desc" },
        take: 10,
      }),

      // Recent payments (activity feed)
      db.salePayment.findMany({
        where: { receivedAt: { gte: thirtyDaysAgo } },
        select: {
          id: true, receivedAt: true, amount: true,
          sale: { select: { phone: { select: { model: true } }, shopBuyer: { select: { name: true } }, customerName: true } },
          recorder: { select: { name: true } },
        },
        orderBy: { receivedAt: "desc" },
        take: 5,
      }),

      // Total cost of available phones (stock value)
      db.phone.aggregate({ where: { status: "available" }, _sum: { costPrice: true } }),

      // Pending from customer phone sales
      db.sale.aggregate({
        where: { saleType: "customer" },
        _sum: { sellingPrice: true, amountReceived: true },
      }),

      // Direct profit this month
      db.directProfit.aggregate({
        where: { profitDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),

      // Accessory lots owed to suppliers
      db.accessoryLot.aggregate({ _sum: { totalCost: true, amountPaid: true } }),

      // Accessory sales pending from shops
      db.accessorySale.aggregate({
        where: { saleType: "shop" },
        _sum: { totalSellingPrice: true, amountReceived: true },
      }),

      // Accessory sales this month for profit
      db.accessorySale.findMany({
        where: { soldAt: { gte: monthStart, lte: monthEnd } },
        select: {
          totalSellingPrice: true, quantity: true, sellingPricePerPiece: true,
          lot: { select: { totalCost: true, totalPieces: true } },
        },
      }),
    ])

    // Phone profit this month
    const revenueThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.sellingPrice), 0)
    const costThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.phone.costPrice), 0)

    // Accessory profit this month (revenue - cost_per_piece * quantity)
    const accRevenueThisMonth = accessorySalesThisMonth.reduce((sum, s) => sum + Number(s.totalSellingPrice), 0)
    const accCostThisMonth = accessorySalesThisMonth.reduce((sum, s) => {
      const costPerPiece = s.lot.totalPieces > 0 ? Number(s.lot.totalCost) / s.lot.totalPieces : 0
      return sum + costPerPiece * s.quantity
    }, 0)

    const profitThisMonth = (revenueThisMonth - costThisMonth) + (accRevenueThisMonth - accCostThisMonth)

    const totalOwedToSuppliers = Math.max(
      0,
      (supplierOwing._sum.totalAmount?.toNumber() || 0) -
      (supplierOwing._sum.amountPaid?.toNumber() || 0) -
      (supplierDirectPayments._sum.amount?.toNumber() || 0) +
      (accessoryLotOwing._sum.totalCost?.toNumber() || 0) -
      (accessoryLotOwing._sum.amountPaid?.toNumber() || 0)
    )

    const phonePendingFromShops =
      (shopOwing._sum.sellingPrice?.toNumber() || 0) - (shopOwing._sum.amountReceived?.toNumber() || 0)
    const accessoryPendingFromShops =
      (accessoryShopOwing._sum.totalSellingPrice?.toNumber() || 0) -
      (accessoryShopOwing._sum.amountReceived?.toNumber() || 0)
    const totalPendingFromShops =
      phonePendingFromShops + accessoryPendingFromShops +
      (shopPriorBalOwing._sum.amount?.toNumber() || 0) - (shopPriorBalOwing._sum.amountPaid?.toNumber() || 0)

    const availableStockValue = availableStockAgg._sum.costPrice?.toNumber() ?? 0
    const customerPending =
      (customerSaleAgg._sum.sellingPrice?.toNumber() ?? 0) -
      (customerSaleAgg._sum.amountReceived?.toNumber() ?? 0)
    const totalCapital = availableStockValue + totalPendingFromShops + customerPending - totalOwedToSuppliers
    const directProfitThisMonth = directProfitAgg._sum.amount?.toNumber() ?? 0

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
        revenueThisMonth: revenueThisMonth + accRevenueThisMonth,
        costThisMonth: costThisMonth + accCostThisMonth,
        availableStockValue,
        customerPending,
        totalCapital,
        directProfitThisMonth,
      },
      activity,
    })

    response.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=30")
    return response
  } catch (err) {
    console.error("[GET /api/dashboard]", err)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
