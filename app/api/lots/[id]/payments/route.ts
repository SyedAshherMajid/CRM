import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { amount, notes } = body

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 })
  }

  const lot = await db.purchaseLot.findUnique({ where: { id } })
  if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 })

  const newTotal = Number(lot.amountPaid) + Number(amount)
  if (newTotal > Number(lot.totalAmount)) {
    return NextResponse.json(
      { error: `Payment would exceed total amount. Remaining: PKR ${(Number(lot.totalAmount) - Number(lot.amountPaid)).toLocaleString()}` },
      { status: 400 }
    )
  }

  const [payment] = await db.$transaction([
    db.lotPayment.create({
      data: { lotId: id, amount: Number(amount), notes: notes?.trim() || null, recordedBy: user.id },
    }),
    db.purchaseLot.update({
      where: { id },
      data: { amountPaid: newTotal },
    }),
  ])

  return NextResponse.json(payment, { status: 201 })
}
