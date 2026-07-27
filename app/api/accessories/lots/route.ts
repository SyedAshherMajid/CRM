import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromAccessoryCategory, toAccessoryCategory } from "@/lib/utils/enum-mappers"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const lots = await db.accessoryLot.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        _count: { select: { sales: true } },
        sales: { select: { quantity: true } },
      },
    })

    return NextResponse.json(
      lots.map((lot) => {
        const soldPieces = lot.sales.reduce((s, sale) => s + sale.quantity, 0)
        const totalCost = Number(lot.totalCost)
        const costPerPiece = lot.totalPieces > 0 ? totalCost / lot.totalPieces : 0
        return {
          id: lot.id,
          name: lot.name,
          category: fromAccessoryCategory(lot.category as string),
          supplierName: lot.supplier?.name ?? null,
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
        }
      })
    )
  } catch (err) {
    console.error("[GET /api/accessories/lots]", err)
    return NextResponse.json({ error: "Failed to load lots" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, category, supplierId, totalPieces, totalCost, amountPaid, notes } = body

    if (!name?.trim()) return NextResponse.json({ error: "Lot name is required" }, { status: 400 })
    if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 })
    if (!totalPieces || totalPieces < 1) return NextResponse.json({ error: "Total pieces must be at least 1" }, { status: 400 })
    if (!totalCost || Number(totalCost) <= 0) return NextResponse.json({ error: "Total cost is required" }, { status: 400 })

    const initialPayment = Math.max(0, Number(amountPaid) || 0)
    const prismaCategory = toAccessoryCategory(category)

    const lot = await db.$transaction(async (tx) => {
      const created = await tx.accessoryLot.create({
        data: {
          name: name.trim(),
          category: prismaCategory as never,
          supplierId: supplierId || null,
          totalPieces: Number(totalPieces),
          totalCost: Number(totalCost),
          amountPaid: initialPayment,
          notes: notes?.trim() || null,
          createdBy: user.id,
        },
      })

      if (initialPayment > 0) {
        await tx.accessoryLotPayment.create({
          data: { lotId: created.id, amount: initialPayment, recordedBy: user.id, notes: "Initial payment" },
        })
      }

      return created
    })

    return NextResponse.json({ id: lot.id }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/accessories/lots]", err)
    return NextResponse.json({ error: "Failed to create lot" }, { status: 500 })
  }
}
