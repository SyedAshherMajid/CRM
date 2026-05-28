import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand, fromStorage, fromCondition } from "@/lib/utils/enum-mappers"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const shop = await db.shopBuyer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { soldAt: "desc" },
          include: {
            phone: {
              select: {
                id: true, brand: true, model: true, storage: true,
                color: true, imei: true, costPrice: true,
                lot: { select: { id: true, name: true } },
              },
            },
            payments: { orderBy: { receivedAt: "desc" } },
          },
        },
      },
    })

    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 })

    const outstanding = shop.sales.reduce(
      (sum, s) => sum + (Number(s.sellingPrice) - Number(s.amountReceived)),
      0
    )

    // Collect all payments across all sales, newest first
    const allPayments = shop.sales
      .flatMap((s) => s.payments.map((p) => ({ ...p, amount: p.amount.toString() })))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())

    return NextResponse.json({
      ...shop,
      outstanding,
      allPayments,
      sales: shop.sales.map((s) => ({
        ...s,
        sellingPrice: s.sellingPrice.toString(),
        amountReceived: s.amountReceived.toString(),
        phone: {
          ...s.phone,
          brand: fromBrand(s.phone.brand),
          storage: fromStorage(s.phone.storage),
          costPrice: s.phone.costPrice.toString(),
        },
        payments: s.payments.map((p) => ({ ...p, amount: p.amount.toString() })),
      })),
    })
  } catch (err) {
    console.error("[GET /api/shops/[id]]", err)
    return NextResponse.json({ error: "Failed to load shop" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { name, phone, address, notes } = body

    if (name !== undefined && !name.trim())
      return NextResponse.json({ error: "Shop name cannot be empty" }, { status: 400 })

    const shop = await db.shopBuyer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() || null }),
        ...(address !== undefined && { address: address.trim() || null }),
        ...(notes !== undefined && { notes: notes.trim() || null }),
      },
    })

    return NextResponse.json(shop)
  } catch (err) {
    console.error("[PATCH /api/shops/[id]]", err)
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 })
  }
}
