import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Parallel: shop rows + sale aggregates per shop in one raw SQL query
    const [shops, saleStats] = await Promise.all([
      db.shopBuyer.findMany({ orderBy: { createdAt: "desc" } }),
      db.$queryRaw<Array<{
        shop_buyer_id: string
        total_selling: string
        total_received: string
        total_sales: bigint
        pending_count: bigint
        last_sale_at: Date | null
      }>>`
        SELECT
          shop_buyer_id,
          COALESCE(SUM(selling_price), 0)::text   AS total_selling,
          COALESCE(SUM(amount_received), 0)::text AS total_received,
          COUNT(*)::bigint                         AS total_sales,
          COUNT(*) FILTER (WHERE selling_price > amount_received)::bigint AS pending_count,
          MAX(sold_at)                             AS last_sale_at
        FROM sales
        WHERE shop_buyer_id IS NOT NULL
        GROUP BY shop_buyer_id
      `,
    ])

    const statsMap = new Map(saleStats.map((s) => [s.shop_buyer_id, s]))

    return NextResponse.json(
      shops.map((shop) => {
        const stats = statsMap.get(shop.id)
        const outstanding = stats
          ? Number(stats.total_selling) - Number(stats.total_received)
          : 0
        return {
          id: shop.id,
          name: shop.name,
          phone: shop.phone,
          address: shop.address,
          notes: shop.notes,
          createdAt: shop.createdAt,
          outstanding,
          pendingCount: stats ? Number(stats.pending_count) : 0,
          lastTransactionAt: stats?.last_sale_at ?? null,
          totalSales: stats ? Number(stats.total_sales) : 0,
        }
      })
    )
  } catch (err) {
    console.error("[GET /api/shops]", err)
    return NextResponse.json({ error: "Failed to load shops" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, phone, address, notes } = body

    if (!name?.trim())
      return NextResponse.json({ error: "Shop name is required" }, { status: 400 })

    const shop = await db.shopBuyer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(shop, { status: 201 })
  } catch (err) {
    console.error("[POST /api/shops]", err)
    return NextResponse.json({ error: "Failed to create shop" }, { status: 500 })
  }
}
