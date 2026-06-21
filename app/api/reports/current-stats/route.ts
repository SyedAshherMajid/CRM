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
    const shopsMapped = shopOwingRows.map((r) => ({
      name: r.shop_name,
      outstanding: Number(r.outstanding),
      pendingCount: Number(r.pending_count),
      totalSales: Number(r.total_sales),
    }))
    const totalShopsOwing = shopsMapped.reduce((s, r) => s + Math.max(0, r.outstanding), 0)

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

    // Group lots by supplier
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
