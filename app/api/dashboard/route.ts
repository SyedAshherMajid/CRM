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

    // 1. Available phones count
    const availableCount = await db.phone.count({
      where: { status: "available" },
    })

    // 2. Phones sold this month
    const soldThisMonth = await db.sale.count({
      where: {
        soldAt: { gte: monthStart, lte: monthEnd },
      },
    })

    // 3. Remaining owed to suppliers (sum of all lots)
    const supplierOwing = await db.purchaseLot.aggregate({
      _sum: { totalAmount: true, amountPaid: true },
    })
    const totalOwedToSuppliers =
      (supplierOwing._sum.totalAmount?.toNumber() || 0) - (supplierOwing._sum.amountPaid?.toNumber() || 0)

    // 4. Pending from shops (sum of all sales)
    const shopOwing = await db.sale.aggregate({
      _sum: { sellingPrice: true, amountReceived: true },
    })
    const totalPendingFromShops =
      (shopOwing._sum.sellingPrice?.toNumber() || 0) - (shopOwing._sum.amountReceived?.toNumber() || 0)

    // 5. Profit this month (selling price - cost price for sales this month)
    const salesThisMonth = await db.sale.findMany({
      where: {
        soldAt: { gte: monthStart, lte: monthEnd },
      },
      select: {
        sellingPrice: true,
        phone: { select: { costPrice: true } },
      },
    })
    const revenueThisMonth = salesThisMonth.reduce(
      (sum, s) => sum + Number(s.sellingPrice),
      0
    )
    const costThisMonth = salesThisMonth.reduce(
      (sum, s) => sum + Number(s.phone.costPrice),
      0
    )
    const profitThisMonth = revenueThisMonth - costThisMonth

    // 6. Recent activity (last 15 mixed actions)
    const [recentPhones, recentSales, recentPayments] = await Promise.all([
      db.phone.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
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
      db.sale.findMany({
        where: { soldAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
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
      db.salePayment.findMany({
        where: { receivedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
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

    // Merge and sort activity
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

    return NextResponse.json({
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
  } catch (err) {
    console.error("[GET /api/dashboard]", err)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
