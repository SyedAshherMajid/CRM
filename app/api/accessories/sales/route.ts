import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromAccessoryCategory } from "@/lib/utils/enum-mappers"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get("shopId")

    const sales = await db.accessorySale.findMany({
      where: shopId ? { shopBuyerId: shopId } : undefined,
      orderBy: { soldAt: "desc" },
      take: 100,
      include: {
        lot: { select: { id: true, name: true, category: true } },
        shopBuyer: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(
      sales.map((s) => ({
        id: s.id,
        lot: s.lot ? { ...s.lot, category: fromAccessoryCategory(s.lot.category as string) } : null,
        quantity: s.quantity,
        sellingPricePerPiece: Number(s.sellingPricePerPiece),
        totalSellingPrice: Number(s.totalSellingPrice),
        amountReceived: Number(s.amountReceived),
        pending: Number(s.totalSellingPrice) - Number(s.amountReceived),
        saleType: s.saleType,
        shopBuyer: s.shopBuyer,
        customerName: s.customerName,
        soldAt: s.soldAt,
        notes: s.notes,
      }))
    )
  } catch (err) {
    console.error("[GET /api/accessories/sales]", err)
    return NextResponse.json({ error: "Failed to load sales" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { lotId, quantity, sellingPricePerPiece, amountReceived, saleType, shopBuyerId, customerName, notes } = body

    if (!lotId) return NextResponse.json({ error: "Lot is required" }, { status: 400 })
    if (!quantity || Number(quantity) < 1) return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 })
    if (!sellingPricePerPiece || Number(sellingPricePerPiece) <= 0)
      return NextResponse.json({ error: "Selling price per piece is required" }, { status: 400 })
    if (!saleType || !["customer", "shop"].includes(saleType))
      return NextResponse.json({ error: "Invalid sale type" }, { status: 400 })
    if (saleType === "shop" && !shopBuyerId)
      return NextResponse.json({ error: "Shop buyer is required for shop sales" }, { status: 400 })

    // Check remaining pieces
    const lot = await db.accessoryLot.findUnique({
      where: { id: lotId },
      select: {
        id: true,
        totalPieces: true,
        totalCost: true,
        name: true,
        category: true,
        _count: false,
        sales: { select: { quantity: true } },
      },
    })
    if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 })

    const soldPieces = lot.sales.reduce((s, s2) => s + s2.quantity, 0)
    const remaining = lot.totalPieces - soldPieces
    const qty = Number(quantity)

    if (qty > remaining) {
      return NextResponse.json(
        { error: `Only ${remaining} piece(s) remaining in this lot` },
        { status: 400 }
      )
    }

    const totalSellingPrice = qty * Number(sellingPricePerPiece)
    const received = Math.min(Math.max(0, Number(amountReceived) || 0), totalSellingPrice)

    const sale = await db.$transaction(async (tx) => {
      const created = await tx.accessorySale.create({
        data: {
          lotId,
          quantity: qty,
          sellingPricePerPiece: Number(sellingPricePerPiece),
          totalSellingPrice,
          amountReceived: received,
          saleType: saleType as "customer" | "shop",
          shopBuyerId: saleType === "shop" ? shopBuyerId : null,
          customerName: saleType === "customer" ? customerName?.trim() || null : null,
          notes: notes?.trim() || null,
          soldBy: user.id,
        },
      })

      if (received > 0) {
        await tx.accessorySalePayment.create({
          data: { saleId: created.id, amount: received, recordedBy: user.id, notes: "Initial payment" },
        })
      }

      if (saleType === "shop" && shopBuyerId && received > 0) {
        await tx.shopPaymentLog.create({
          data: {
            shopBuyerId,
            amount: received,
            notes: notes?.trim() || null,
            description: `Accessory: ${lot.name} ×${qty}`,
            recordedBy: user.id,
          },
        })
      }

      return created
    })

    return NextResponse.json({ id: sale.id }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/accessories/sales]", err)
    return NextResponse.json({ error: "Failed to record sale" }, { status: 500 })
  }
}
