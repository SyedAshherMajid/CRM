import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { amount, notes } = body

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Payment amount must be greater than 0" }, { status: 400 })

    const sale = await db.accessorySale.findUnique({
      where: { id },
      select: {
        id: true, totalSellingPrice: true, amountReceived: true,
        saleType: true, shopBuyerId: true,
        lot: { select: { name: true } },
        quantity: true,
      },
    })
    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 })

    const pending = Number(sale.totalSellingPrice) - Number(sale.amountReceived)
    if (pending <= 0) return NextResponse.json({ error: "This sale is already fully paid" }, { status: 400 })

    const paying = Math.min(Number(amount), pending)

    await db.$transaction(async (tx) => {
      await tx.accessorySale.update({
        where: { id },
        data: { amountReceived: { increment: paying } },
      })

      await tx.accessorySalePayment.create({
        data: { saleId: id, amount: paying, notes: notes?.trim() || null, recordedBy: user.id },
      })

      if (sale.saleType === "shop" && sale.shopBuyerId) {
        await tx.shopPaymentLog.create({
          data: {
            shopBuyerId: sale.shopBuyerId,
            amount: paying,
            notes: notes?.trim() || null,
            description: `Accessory: ${sale.lot.name} ×${sale.quantity}`,
            recordedBy: user.id,
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[POST /api/accessories/sales/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
