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
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })

    const sale = await db.sale.findUnique({
      where: { id },
      select: { sellingPrice: true, amountReceived: true },
    })
    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 })

    const pending = Number(sale.sellingPrice) - Number(sale.amountReceived)
    if (pending <= 0)
      return NextResponse.json({ error: "This sale is already fully paid" }, { status: 400 })

    const actualAmount = Math.min(Number(amount), pending)
    const newAmountReceived = Number(sale.amountReceived) + actualAmount

    await db.$transaction(async (tx) => {
      await tx.sale.update({ where: { id }, data: { amountReceived: newAmountReceived } })
      await tx.salePayment.create({
        data: { saleId: id, amount: actualAmount, recordedBy: user.id, notes: notes?.trim() || null },
      })
    })

    return NextResponse.json({ success: true, newAmountReceived })
  } catch (err) {
    console.error("[POST /api/sales/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
