import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromAccessoryCategory } from "@/lib/utils/enum-mappers"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const lot = await db.accessoryLot.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        payments: { orderBy: { paidAt: "desc" } },
        sales: {
          orderBy: { soldAt: "desc" },
          include: {
            shopBuyer: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 })

    const soldPieces = lot.sales.reduce((s, sale) => s + sale.quantity, 0)
    const totalCost = Number(lot.totalCost)
    const costPerPiece = lot.totalPieces > 0 ? totalCost / lot.totalPieces : 0
    const totalRevenue = lot.sales.reduce((s, sale) => s + Number(sale.totalSellingPrice), 0)
    const totalReceived = lot.sales.reduce((s, sale) => s + Number(sale.amountReceived), 0)

    return NextResponse.json({
      id: lot.id,
      name: lot.name,
      category: fromAccessoryCategory(lot.category as string),
      supplier: lot.supplier,
      supplierId: lot.supplierId,
      totalPieces: lot.totalPieces,
      soldPieces,
      remainingPieces: lot.totalPieces - soldPieces,
      totalCost,
      costPerPiece,
      amountPaid: Number(lot.amountPaid),
      outstanding: totalCost - Number(lot.amountPaid),
      notes: lot.notes,
      createdAt: lot.createdAt,
      totalRevenue,
      totalReceived,
      totalPending: totalRevenue - totalReceived,
      profit: totalRevenue - soldPieces * costPerPiece,
      payments: lot.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paidAt: p.paidAt,
        notes: p.notes,
      })),
      sales: lot.sales.map((s) => ({
        id: s.id,
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
      })),
    })
  } catch (err) {
    console.error("[GET /api/accessories/lots/[id]]", err)
    return NextResponse.json({ error: "Failed to load lot" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { name, notes } = body

    if (name !== undefined && !name.trim())
      return NextResponse.json({ error: "Lot name cannot be empty" }, { status: 400 })

    await db.accessoryLot.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(notes !== undefined && { notes: notes.trim() || null }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[PATCH /api/accessories/lots/[id]]", err)
    return NextResponse.json({ error: "Failed to update lot" }, { status: 500 })
  }
}
