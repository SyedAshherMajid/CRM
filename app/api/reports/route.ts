import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { get1010MonthRange, format1010MonthLabel } from "@/lib/utils/month-cycle"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get("timeframe") || "month"
    const dateStr = searchParams.get("date")
    const targetDate = dateStr ? new Date(dateStr) : new Date()

    let start: Date, end: Date, monthLabel: string

    if (timeframe === "all") {
      start = new Date("2000-01-01")
      end = new Date()
      monthLabel = "All Time"
    } else {
      const range = get1010MonthRange(targetDate)
      start = range.start
      end = range.end
      monthLabel = range.monthLabel
    }

    const purchasedPhones = await db.phone.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { costPrice: true, brand: true, condition: true },
    })
    const totalPhonesPurchased = purchasedPhones.length
    const totalPurchaseCost = purchasedPhones.reduce((sum, p) => sum + Number(p.costPrice), 0)

    const allSales = await db.sale.findMany({
      where: { soldAt: { gte: start, lte: end } },
      select: {
        id: true,
        phone: { select: { model: true, costPrice: true } },
        sellingPrice: true,
        shopBuyer: { select: { name: true } },
        customerName: true,
        soldAt: true,
      },
      orderBy: { soldAt: "desc" },
    })

    const totalPhonesSold = allSales.length
    const totalSaleRevenue = allSales.reduce((sum, s) => sum + Number(s.sellingPrice), 0)
    const totalCostOfSold = allSales.reduce((sum, s) => sum + Number(s.phone.costPrice), 0)
    const totalProfit = totalSaleRevenue - totalCostOfSold
    const averageProfitPerPhone = totalPhonesSold > 0 ? totalProfit / totalPhonesSold : 0

    const salesDetails = allSales.map((s) => ({
      phoneModel: s.phone.model,
      brand: "iPhone",
      shopBuyerName: s.shopBuyer?.name,
      customerName: s.customerName,
      sellingPrice: `PKR ${(Number(s.sellingPrice) / 100000).toFixed(1)} Lakh`,
      costPrice: `PKR ${(Number(s.phone.costPrice) / 100000).toFixed(1)} Lakh`,
      profit: `PKR ${((Number(s.sellingPrice) - Number(s.phone.costPrice)) / 100000).toFixed(1)} Lakh`,
      soldAt: new Date(s.soldAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }),
    }))

    const allLots = await db.purchaseLot.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { totalAmount: true, amountPaid: true },
    })
    const totalOwedToSuppliers = allLots.reduce((sum, lot) => sum + (Number(lot.totalAmount) - Number(lot.amountPaid)), 0)

    const allSalesForShops = await db.sale.findMany({
      where: { soldAt: { gte: start, lte: end }, saleType: "shop" },
      select: { sellingPrice: true, amountReceived: true, shopBuyer: { select: { id: true, name: true } } },
    })

    const shopMap = new Map()
    allSalesForShops.forEach((sale) => {
      if (sale.shopBuyer) {
        const key = sale.shopBuyer.id
        if (!shopMap.has(key)) shopMap.set(key, { name: sale.shopBuyer.name, totalOwed: 0, salesCount: 0 })
        const shop = shopMap.get(key)
        shop.totalOwed += Number(sale.sellingPrice) - Number(sale.amountReceived)
        shop.salesCount += 1
      }
    })

    const shopDetails = Array.from(shopMap.values()).map((shop) => ({
      name: shop.name,
      amountOwed: `PKR ${(shop.totalOwed / 100000).toFixed(1)} Lakh`,
      salesCount: shop.salesCount,
    }))

    const totalPendingFromShops = Array.from(shopMap.values()).reduce((sum, shop) => sum + shop.totalOwed, 0)

    return NextResponse.json({
      monthLabel,
      stats: {
        totalPhonesPurchased,
        totalPurchaseCost: `PKR ${(totalPurchaseCost / 100000).toFixed(1)} Lakh`,
        totalPhonesSold,
        totalSaleRevenue: `PKR ${(totalSaleRevenue / 100000).toFixed(1)} Lakh`,
        totalProfit: `PKR ${(totalProfit / 100000).toFixed(1)} Lakh`,
        averageProfitPerPhone: `PKR ${(averageProfitPerPhone / 100000).toFixed(1)} Lakh`,
      },
      budgeting: {
        totalOwedToSuppliers: `PKR ${(totalOwedToSuppliers / 100000).toFixed(1)} Lakh`,
        totalPendingFromShops: `PKR ${(totalPendingFromShops / 100000).toFixed(1)} Lakh`,
        lotsCreated: allLots.length,
        salesCount: totalPhonesSold,
      },
      sales: salesDetails,
      shopDetails,
    })
  } catch (err) {
    console.error("[GET /api/reports]", err)
    return NextResponse.json({ error: "Failed to load report" }, { status: 500 })
  }
}
