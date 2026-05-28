import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const shops = await db.shopBuyer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sales: {
          select: { sellingPrice: true, amountReceived: true, soldAt: true },
        },
      },
    })

    return NextResponse.json(
      shops.map((shop) => {
        const outstanding = shop.sales.reduce(
          (sum, s) => sum + (Number(s.sellingPrice) - Number(s.amountReceived)),
          0
        )
        const lastSale = shop.sales.sort(
          (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()
        )[0]
        const pendingCount = shop.sales.filter(
          (s) => Number(s.sellingPrice) > Number(s.amountReceived)
        ).length
        return {
          id: shop.id,
          name: shop.name,
          phone: shop.phone,
          address: shop.address,
          notes: shop.notes,
          createdAt: shop.createdAt,
          outstanding,
          pendingCount,
          lastTransactionAt: lastSale?.soldAt ?? null,
          totalSales: shop.sales.length,
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
