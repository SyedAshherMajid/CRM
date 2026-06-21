import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { get1010MonthRange } from "@/lib/utils/month-cycle"
import { fromBrand } from "@/lib/utils/enum-mappers"

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

    const dateFilter = { gte: start, lte: end }

    // 9 queries fired in parallel
    const [
      phonesAgg,
      salesAgg,
      costOfSoldRows,
      lotsAgg,
      salesForDetails,
      shopSales,
      expensesRaw,
      purchasedPhonesRaw,
      lotsWithSuppliers,
    ] = await Promise.all([
      // 1. Phone purchase stats
      db.phone.aggregate({
        where: { createdAt: dateFilter },
        _count: { id: true },
        _sum: { costPrice: true },
      }),

      // 2. Sale totals
      db.sale.aggregate({
        where: { soldAt: dateFilter },
        _count: { id: true },
        _sum: { sellingPrice: true },
      }),

      // 3. Cost of sold phones (requires JOIN)
      db.$queryRaw<[{ total_cost: string }]>`
        SELECT COALESCE(SUM(p.cost_price), 0)::text AS total_cost
        FROM sales s
        INNER JOIN phones p ON s.phone_id = p.id
        WHERE s.sold_at >= ${start} AND s.sold_at <= ${end}
      `,

      // 4. Lot stats
      db.purchaseLot.aggregate({
        where: { createdAt: dateFilter },
        _count: { id: true },
        _sum: { totalAmount: true, amountPaid: true },
      }),

      // 5. Sales detail list (capped at 100 most recent)
      db.sale.findMany({
        where: { soldAt: dateFilter },
        select: {
          id: true,
          phone: { select: { brand: true, model: true, costPrice: true } },
          sellingPrice: true,
          shopBuyer: { select: { name: true } },
          customerName: true,
          soldAt: true,
          saleType: true,
        },
        orderBy: { soldAt: "desc" },
        take: 100,
      }),

      // 6. Shop-type sales for per-shop breakdown
      db.sale.findMany({
        where: { soldAt: dateFilter, saleType: "shop" },
        select: {
          sellingPrice: true,
          amountReceived: true,
          shopBuyer: { select: { id: true, name: true } },
        },
      }),

      // 7. Expenses in period
      db.expense.findMany({
        where: { expenseDate: dateFilter },
        orderBy: { expenseDate: "desc" },
        include: { recorder: { select: { name: true } } },
        take: 200,
      }),

      // 8. Phones purchased detail list
      db.phone.findMany({
        where: { createdAt: dateFilter },
        select: {
          brand: true,
          model: true,
          costPrice: true,
          lot: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      // 9. Lots with suppliers for breakdown
      db.purchaseLot.findMany({
        where: { createdAt: dateFilter },
        select: {
          name: true,
          totalAmount: true,
          amountPaid: true,
          supplier: { select: { id: true, name: true } },
        },
      }),
    ])

    // Compute totals
    const totalPhonesPurchased = phonesAgg._count.id
    const totalPurchaseCost = Number(phonesAgg._sum.costPrice ?? 0)

    const totalPhonesSold = salesAgg._count.id
    const totalSaleRevenue = Number(salesAgg._sum.sellingPrice ?? 0)
    const totalCostOfSold = Number(costOfSoldRows[0]?.total_cost ?? 0)
    const totalProfit = totalSaleRevenue - totalCostOfSold
    const averageProfitPerPhone = totalPhonesSold > 0 ? totalProfit / totalPhonesSold : 0

    const totalOwedToSuppliers =
      Number(lotsAgg._sum.totalAmount ?? 0) - Number(lotsAgg._sum.amountPaid ?? 0)

    // Expenses
    const totalExpenses = expensesRaw.reduce((sum, e) => sum + Number(e.amount), 0)
    const netProfit = totalProfit - totalExpenses

    const expenseDetails = expensesRaw.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      category: e.category as string,
      description: e.description,
      expenseDate: new Date(e.expenseDate).toLocaleDateString("en-PK", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      notes: e.notes,
      recordedBy: e.recorder.name,
    }))

    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {}
    for (const e of expensesRaw) {
      const cat = e.category as string
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(e.amount)
    }

    // Purchased phones detail
    const purchasedPhones = purchasedPhonesRaw.map((p) => ({
      brand: fromBrand(p.brand),
      model: p.model,
      costPrice: Number(p.costPrice),
      lotName: p.lot.name,
    }))

    // Sales detail table
    const salesDetails = salesForDetails.map((s) => {
      const selling = Number(s.sellingPrice)
      const cost = Number(s.phone.costPrice)
      return {
        phoneModel: s.phone.model,
        brand: fromBrand(s.phone.brand),
        shopBuyerName: s.shopBuyer?.name ?? null,
        customerName: s.customerName ?? null,
        saleType: s.saleType as string,
        sellingPrice: selling,
        costPrice: cost,
        profit: selling - cost,
        soldAt: new Date(s.soldAt).toLocaleDateString("en-PK", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }
    })

    // Per-shop breakdown
    const shopMap = new Map<string, { name: string; totalOwed: number; salesCount: number }>()
    for (const sale of shopSales) {
      if (sale.shopBuyer) {
        const key = sale.shopBuyer.id
        if (!shopMap.has(key)) shopMap.set(key, { name: sale.shopBuyer.name, totalOwed: 0, salesCount: 0 })
        const shop = shopMap.get(key)!
        shop.totalOwed += Number(sale.sellingPrice) - Number(sale.amountReceived)
        shop.salesCount += 1
      }
    }
    const shopDetails = Array.from(shopMap.values()).map((shop) => ({
      name: shop.name,
      amountOwed: shop.totalOwed,
      salesCount: shop.salesCount,
    }))
    const totalPendingFromShops = Array.from(shopMap.values()).reduce((sum, s) => sum + s.totalOwed, 0)

    // Per-supplier breakdown
    const supplierMap = new Map<
      string,
      { name: string; totalOwed: number; lotsCount: number; lots: Array<{ name: string; owed: number }> }
    >()
    for (const lot of lotsWithSuppliers) {
      const key = lot.supplier?.id ?? "__no_supplier__"
      const name = lot.supplier?.name ?? "No Supplier"
      const owed = Number(lot.totalAmount) - Number(lot.amountPaid)
      if (!supplierMap.has(key)) {
        supplierMap.set(key, { name, totalOwed: 0, lotsCount: 0, lots: [] })
      }
      const entry = supplierMap.get(key)!
      entry.totalOwed += owed
      entry.lotsCount++
      entry.lots.push({ name: lot.name, owed })
    }
    const supplierDetails = Array.from(supplierMap.values())

    const response = NextResponse.json({
      monthLabel,
      stats: {
        totalPhonesPurchased,
        totalPurchaseCost,
        totalPhonesSold,
        totalSaleRevenue,
        totalProfit,
        netProfit,
        totalExpenses,
        averageProfitPerPhone,
      },
      budgeting: {
        totalOwedToSuppliers,
        totalPendingFromShops,
        lotsCreated: lotsAgg._count.id,
        salesCount: totalPhonesSold,
      },
      sales: salesDetails,
      shopDetails,
      expenseDetails,
      expenseByCategory,
      supplierDetails,
      purchasedPhones,
    })

    response.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=60")
    return response
  } catch (err) {
    console.error("[GET /api/reports]", err)
    return NextResponse.json({ error: "Failed to load report" }, { status: 500 })
  }
}
