import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand } from "@/lib/utils/enum-mappers"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name")

    // ── Detail mode: return all sales for a named customer ──────────────────
    if (name) {
      const sales = await db.sale.findMany({
        where: { saleType: "customer", customerName: name },
        select: {
          id: true,
          sellingPrice: true,
          amountReceived: true,
          soldAt: true,
          notes: true,
          phone: {
            select: {
              id: true,
              brand: true,
              model: true,
              storage: true,
              color: true,
              imei: true,
              costPrice: true,
              lot: { select: { id: true, name: true } },
            },
          },
          payments: {
            select: { id: true, amount: true, receivedAt: true, notes: true },
            orderBy: { receivedAt: "desc" },
          },
        },
        orderBy: { soldAt: "desc" },
      })

      const outstanding = sales.reduce(
        (sum, s) => sum + (Number(s.sellingPrice) - Number(s.amountReceived)),
        0
      )

      return NextResponse.json({
        name,
        outstanding,
        sales: sales.map((s) => ({
          id: s.id,
          sellingPrice: Number(s.sellingPrice),
          amountReceived: Number(s.amountReceived),
          pending: Number(s.sellingPrice) - Number(s.amountReceived),
          soldAt: s.soldAt,
          notes: s.notes,
          phone: {
            id: s.phone.id,
            brand: fromBrand(s.phone.brand),
            model: s.phone.model,
            storage: s.phone.storage,
            color: s.phone.color,
            imei: s.phone.imei,
            costPrice: Number(s.phone.costPrice),
            lotId: s.phone.lot.id,
            lotName: s.phone.lot.name,
          },
          payments: s.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            receivedAt: p.receivedAt,
            notes: p.notes,
          })),
        })),
      })
    }

    // ── List mode: return all customers grouped by name ──────────────────────
    const rows = await db.$queryRaw<
      Array<{
        customer_name: string
        total_selling: string
        total_received: string
        total_sales: bigint
        pending_count: bigint
        last_sale_at: Date | null
      }>
    >`
      SELECT
        customer_name,
        COALESCE(SUM(selling_price), 0)::text              AS total_selling,
        COALESCE(SUM(amount_received), 0)::text            AS total_received,
        COUNT(*)::bigint                                    AS total_sales,
        COUNT(*) FILTER (WHERE selling_price > amount_received)::bigint AS pending_count,
        MAX(sold_at)                                        AS last_sale_at
      FROM sales
      WHERE sale_type = 'customer'
        AND customer_name IS NOT NULL
        AND customer_name != ''
      GROUP BY customer_name
      ORDER BY
        (SUM(selling_price) - SUM(amount_received)) DESC,
        customer_name
    `

    return NextResponse.json(
      rows.map((r) => ({
        name: r.customer_name,
        outstanding: Number(r.total_selling) - Number(r.total_received),
        pendingCount: Number(r.pending_count),
        totalSales: Number(r.total_sales),
        lastSaleAt: r.last_sale_at,
      }))
    )
  } catch (err) {
    console.error("[GET /api/customers]", err)
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 })
  }
}
