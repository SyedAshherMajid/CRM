import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand, fromStorage, fromCondition, fromPtaStatus } from "@/lib/utils/enum-mappers"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const lot = await db.purchaseLot.findUnique({
      where: { id },
      include: {
        supplier: true,
        payments: { orderBy: { paidAt: "desc" } },
        phones: {
          orderBy: [{ model: "asc" }, { createdAt: "asc" }],
          take: 500,
          include: {
            sale: {
              select: {
                sellingPrice: true, amountReceived: true, saleType: true,
                shopBuyer: { select: { name: true } }, customerName: true,
              },
            },
          },
        },
      },
    })

    if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 })

    // Serialize enum keys to display-friendly strings for the frontend
    const serialized = {
      ...lot,
      phones: lot.phones.map((p) => ({
        ...p,
        brand: fromBrand(p.brand),
        storage: fromStorage(p.storage),
        condition: fromCondition(p.condition),
        ptaStatus: fromPtaStatus(p.ptaStatus),
        costPrice: p.costPrice.toString(),
        sale: p.sale
          ? { ...p.sale, sellingPrice: p.sale.sellingPrice.toString(), amountReceived: p.sale.amountReceived.toString() }
          : null,
      })),
      payments: lot.payments.map((p) => ({ ...p, amount: p.amount.toString() })),
      totalAmount: lot.totalAmount.toString(),
      amountPaid: lot.amountPaid.toString(),
    }

    return NextResponse.json(serialized)
  } catch (err) {
    console.error("[GET /api/lots/[id]]", err)
    return NextResponse.json({ error: "Failed to load lot" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, notes } = body

  const lot = await db.purchaseLot.update({
    where: { id },
    data: { name: name?.trim(), notes: notes?.trim() || null },
  })

  return NextResponse.json(lot)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const lot = await db.purchaseLot.findUnique({
      where: { id },
      select: {
        id: true,
        phones: {
          select: {
            id: true,
            sale: { select: { id: true } },
          },
        },
      },
    })

    if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 })

    const hasSales = lot.phones.some((phone) => phone.sale)
    if (hasSales) {
      return NextResponse.json(
        { error: "Cannot delete a lot that has sold phones. Sales history must be preserved." },
        { status: 400 }
      )
    }

    await db.$transaction([
      db.phone.deleteMany({ where: { lotId: id } }),
      db.purchaseLot.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/lots/[id]]", err)
    return NextResponse.json({ error: "Failed to delete lot" }, { status: 500 })
  }
}
