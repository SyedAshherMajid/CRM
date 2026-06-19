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

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Verify supplier exists
    const supplier = await db.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    // Create supplier payment record
    const payment = await db.supplierPayment.create({
      data: {
        supplierId: id,
        amount: parseFloat(amount),
        notes: notes || null,
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
