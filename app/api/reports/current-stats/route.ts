import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand, fromStorage, fromCondition } from "@/lib/utils/enum-mappers"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [
      stockAgg,
      defectiveAgg,
      returnedAgg,
      stockPhones,
      defectivePhones,
      shopOwingRows,
      customerOwingRows,
      lotsForSuppliers,
      supplierDirectPayPerSupplier,
      priorBalRows,
      accessoryShopStats,
      accessoryLotStats,
    ] = await Promise.all([

      // 1. Available phones aggregate
      db.phone.aggregate({
        where: { status: "available" },
        _count: { id: true },
        _sum: { costPrice: true },
      }),

      // 2. Defective phones aggregate
      db.phone.aggregate({
        where: { status: "defective" },
        _count: { id: true },
        _sum: { costPrice: true },
      }),

      // 3. Returned phones aggregate
      db.phone.aggregate({
        where: { status: "returned" },
        _count: { id: true },
        _sum: { costPrice: true },
      }),

      // 4. Available phones list for modal
      db.phone.findMany({
        where: { status: "available" },
        select: {
          id: true,
          brand: true,
          model: true,
          storage: true,
          color: true,
          imei: true,
          condition: true,
          costPrice: true,
          lot: { select: { name: true } },
        },
        orderBy: [{ model: "asc" }, { costPrice: "desc" }],
        take: 500,
      }),

      // 5. Defective phones list for modal
      db.phone.findMany({
        where: { status: "defective" },
        select: {
          id: true,
          brand: true,
          model: true,
          storage: true,
          color: true,
          imei: true,
          costPrice: true,
          notes: true,
          lot: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      // 6. Per-shop all-time outstanding
      db.$queryRaw<Array<{
        shop_buyer_id: string
        shop_name: string
        outstanding: string
        pending_count: bigint
        total_sales: bigint
      }>>`
        SELECT
          s.shop_buyer_id,
          sb.name                                                              AS shop_name,
          (COALESCE(SUM(s.selling_price),0) - COALESCE(SUM(s.amount_received),0))::text AS outstanding,
          COUNT(*) FILTER (WHERE s.selling_price > s.amount_received)::bigint AS pending_count,
          COUNT(*)::bigint                                                     AS total_sales
        FROM sales s
        JOIN shop_buyers sb ON sb.id = s.shop_buyer_id
        WHERE s.sale_type = 'shop'
        GROUP BY s.shop_buyer_id, sb.name
        ORDER BY outstanding DESC
      `,

      // 7. Per-customer all-time outstanding
      db.$queryRaw<Array<{
        customer_name: string
        outstanding: string
        pending_count: bigint
        total_sales: bigint
      }>>`
        SELECT
          customer_name,
          (COALESCE(SUM(selling_price),0) - COALESCE(SUM(amount_received),0))::text AS outstanding,
          COUNT(*) FILTER (WHERE selling_price > amount_received)::bigint AS pending_count,
          COUNT(*)::bigint                                                 AS total_sales
        FROM sales
        WHERE sale_type = 'customer'
          AND customer_name IS NOT NULL
          AND customer_name != ''
        GROUP BY customer_name
        ORDER BY outstanding DESC
      `,

      // 8. All lots with supplier info for supplier debt breakdown
      db.purchaseLot.findMany({
        select: {
          name: true,
          totalAmount: true,
          amountPaid: true,
          supplier: { select: { id: true, name: true } },
        },
      }),

      // 9. Direct supplier payments (not via lot) per supplier
      db.supplierPayment.findMany({
        select: {
          supplierId: true,
          amount: true,
        },
      }),

      // 10. Prior balance outstanding per shop (all-time)
      db.shopPriorBalance.findMany({
        select: {
          shopBuyerId: true,
          amount: true,
          amountPaid: true,
          shop: { select: { name: true } },
        },
      }),

      // 11. Accessory sale outstanding per shop
      db.accessorySale.groupBy({
        by: ["shopBuyerId"],
        where: { saleType: "shop", shopBuyerId: { not: null } },
        _sum: { totalSellingPrice: true, amountReceived: true },
      }),

      // 12. Accessory lots for supplier debt breakdown
      db.accessoryLot.findMany({
        select: {
          name: true,
          totalCost: true,
          amountPaid: true,
          supplier: { select: { id: true, name: true } },
        },
      }),
    ])

    // ── Stock ──────────────────────────────────────────────────────────────
    const stockCount = stockAgg._count.id
    const stockValue = Number(stockAgg._sum.costPrice ?? 0)
    const avgCostPrice = stockCount > 0 ? stockValue / stockCount : 0

    const stockPhonesMapped = stockPhones.map((p) => ({
      id: p.id,
      brand: fromBrand(p.brand),
      model: p.model,
      storage: fromStorage(p.storage),
      color: p.color,
      imei: p.imei,
      condition: fromCondition(p.condition),
      costPrice: Number(p.costPrice),
      lotName: p.lot.name,
    }))

    const defectiveMapped = defectivePhones.map((p) => ({
      id: p.id,
      brand: fromBrand(p.brand),
      model: p.model,
      storage: fromStorage(p.storage),
      color: p.color,
      imei: p.imei,
      costPrice: Number(p.costPrice),
      notes: p.notes,
      lotName: p.lot.name,
    }))

    // ── Shops owing ────────────────────────────────────────────────────────
    // Build per-shop prior balance outstanding
    const priorBalMap = new Map<string, { outstanding: number; shopName: string }>()
    for (const pb of priorBalRows) {
      const net = Number(pb.amount) - Number(pb.amountPaid)
      if (!priorBalMap.has(pb.shopBuyerId)) {
        priorBalMap.set(pb.shopBuyerId, { outstanding: 0, shopName: pb.shop.name })
      }
      priorBalMap.get(pb.shopBuyerId)!.outstanding += net
    }

    // Build per-shop accessory outstanding
    const accShopMap = new Map<string, number>()
    for (const a of accessoryShopStats) {
      if (a.shopBuyerId) {
        accShopMap.set(
          a.shopBuyerId,
          (a._sum.totalSellingPrice?.toNumber() ?? 0) - (a._sum.amountReceived?.toNumber() ?? 0)
        )
      }
    }

    // Index phone-sale rows by shop ID
    const shopSalesById = new Map<string, { name: string; outstanding: number; pendingCount: number; totalSales: number }>()
    for (const r of shopOwingRows) {
      shopSalesById.set(r.shop_buyer_id, {
        name: r.shop_name,
        outstanding: Number(r.outstanding),
        pendingCount: Number(r.pending_count),
        totalSales: Number(r.total_sales),
      })
    }

    // Merge phone sales + prior balances + accessories (include shops with only prior balances/accessories)
    const allShopIds = new Set([
      ...shopOwingRows.map(r => r.shop_buyer_id),
      ...Array.from(priorBalMap.keys()),
      ...Array.from(accShopMap.keys()),
    ])
    const shopsMapped = Array.from(allShopIds).map(id => {
      const sales = shopSalesById.get(id)
      const prior = priorBalMap.get(id)
      const acc = accShopMap.get(id) ?? 0
      return {
        name: sales?.name ?? prior?.shopName ?? "Unknown",
        outstanding: (sales?.outstanding ?? 0) + Math.max(0, prior?.outstanding ?? 0) + Math.max(0, acc),
        pendingCount: sales?.pendingCount ?? 0,
        totalSales: sales?.totalSales ?? 0,
      }
    }).filter(s => s.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)

    const totalShopsOwing = shopsMapped.reduce((s, r) => s + r.outstanding, 0)

    // ── Customers owing ────────────────────────────────────────────────────
    const customersMapped = customerOwingRows.map((r) => ({
      name: r.customer_name,
      outstanding: Number(r.outstanding),
      pendingCount: Number(r.pending_count),
      totalSales: Number(r.total_sales),
    }))
    const totalCustomersOwing = customersMapped.reduce((s, r) => s + Math.max(0, r.outstanding), 0)

    // ── Supplier debt ──────────────────────────────────────────────────────
    // Build a map: supplierId → directPaymentsTotal
    const directPayMap = new Map<string, number>()
    for (const p of supplierDirectPayPerSupplier) {
      if (p.supplierId) {
        directPayMap.set(p.supplierId, (directPayMap.get(p.supplierId) ?? 0) + Number(p.amount))
      }
    }

    // Group phone lots + accessory lots by supplier
    const supplierMap = new Map<string, {
      name: string
      lotDebt: number
      lots: Array<{ name: string; owed: number }>
    }>()

    for (const lot of lotsForSuppliers) {
      const key = lot.supplier?.id ?? "__no_supplier__"
      const name = lot.supplier?.name ?? "No Supplier"
      const lotOwed = Number(lot.totalAmount) - Number(lot.amountPaid)
      if (!supplierMap.has(key)) {
        supplierMap.set(key, { name, lotDebt: 0, lots: [] })
      }
      const entry = supplierMap.get(key)!
      entry.lotDebt += lotOwed
      entry.lots.push({ name: lot.name, owed: lotOwed })
    }

    for (const lot of accessoryLotStats) {
      const key = lot.supplier?.id ?? "__no_supplier__"
      const name = lot.supplier?.name ?? "No Supplier"
      const lotOwed = Number(lot.totalCost) - Number(lot.amountPaid)
      if (lotOwed <= 0) continue
      if (!supplierMap.has(key)) {
        supplierMap.set(key, { name, lotDebt: 0, lots: [] })
      }
      const entry = supplierMap.get(key)!
      entry.lotDebt += lotOwed
      entry.lots.push({ name: `${lot.name} (accessories)`, owed: lotOwed })
    }

    const suppliersMapped = Array.from(supplierMap.entries()).map(([key, entry]) => {
      const directPay = key === "__no_supplier__" ? 0 : (directPayMap.get(key) ?? 0)
      const totalOwed = Math.max(0, entry.lotDebt - directPay)
      return {
        name: entry.name,
        totalOwed,
        lotDebt: entry.lotDebt,
        directPaid: directPay,
        lots: entry.lots,
      }
    }).filter((s) => s.totalOwed > 0 || s.lotDebt > 0)
      .sort((a, b) => b.totalOwed - a.totalOwed)

    const totalSupplierDebt = suppliersMapped.reduce((s, r) => s + r.totalOwed, 0)

    // ── Net position ───────────────────────────────────────────────────────
    const totalReceivables = totalShopsOwing + totalCustomersOwing
    const netPosition = stockValue + totalReceivables - totalSupplierDebt

    const response = NextResponse.json({
      stock: {
        count: stockCount,
        totalCostValue: stockValue,
        avgCostPrice,
        phones: stockPhonesMapped,
      },
      defective: {
        count: defectiveAgg._count.id,
        totalCostValue: Number(defectiveAgg._sum.costPrice ?? 0),
        phones: defectiveMapped,
      },
      returned: {
        count: returnedAgg._count.id,
        totalCostValue: Number(returnedAgg._sum.costPrice ?? 0),
      },
      shopOwing: {
        total: totalShopsOwing,
        shopsCount: shopsMapped.filter((s) => s.outstanding > 0).length,
        shops: shopsMapped,
      },
      customerOwing: {
        total: totalCustomersOwing,
        customersCount: customersMapped.filter((c) => c.outstanding > 0).length,
        customers: customersMapped,
      },
      supplierDebt: {
        total: totalSupplierDebt,
        suppliersCount: suppliersMapped.filter((s) => s.totalOwed > 0).length,
        suppliers: suppliersMapped,
      },
      netPosition,
      totalReceivables,
    })

    response.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=30")
    return response
  } catch (err) {
    console.error("[GET /api/reports/current-stats]", err)
    return NextResponse.json({ error: "Failed to load current stats" }, { status: 500 })
  }
}
