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

    const lot = await db.accessoryLot.findUnique({
      where: { id },
      select: { id: true, totalCost: true, amountPaid: true },
    })
    if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 })

    const paying = Number(amount)
    const remaining = Number(lot.totalCost) - Number(lot.amountPaid)
    if (paying > remaining + 0.01) {
      return NextResponse.json(
        { error: `Cannot pay more than the remaining balance (${remaining.toFixed(0)} PKR)` },
        { status: 400 }
      )
    }

    await db.$transaction([
      db.accessoryLot.update({
        where: { id },
        data: { amountPaid: { increment: paying } },
      }),
      db.accessoryLotPayment.create({
        data: { lotId: id, amount: paying, notes: notes?.trim() || null, recordedBy: user.id },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[POST /api/accessories/lots/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
