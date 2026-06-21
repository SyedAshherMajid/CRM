import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { amount, notes } = body

    const paymentAmount = Number(amount)

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Verify supplier exists
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        lots: { select: { totalAmount: true, amountPaid: true } },
        payments: { select: { amount: true } },
      },
    })
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    const totalLotAmount = supplier.lots.reduce((sum, lot) => sum + lot.totalAmount.toNumber(), 0)
    const totalLotPaid = supplier.lots.reduce((sum, lot) => sum + lot.amountPaid.toNumber(), 0)
    const totalDirectPaid = supplier.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)
    const remainingOwed = Math.max(0, totalLotAmount - totalLotPaid - totalDirectPaid)

    if (remainingOwed <= 0) {
      return NextResponse.json({ error: "This supplier is already fully paid" }, { status: 400 })
    }

    if (paymentAmount > remainingOwed) {
      return NextResponse.json(
        { error: `Payment would exceed outstanding balance. Remaining: PKR ${remainingOwed.toLocaleString("en-PK")}` },
        { status: 400 }
      )
    }

    // Create supplier payment record
    const payment = await db.supplierPayment.create({
      data: {
        supplierId: id,
        amount: paymentAmount,
        notes: notes?.trim() || null,
        recordedBy: user.id,
        paidAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, payment })
  } catch (err) {
    console.error("[POST /api/suppliers/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
