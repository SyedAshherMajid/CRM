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

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 })
    }

    // Read, check, and write inside a single transaction so concurrent requests
    // cannot both pass the "would exceed total" check on the same stale snapshot.
    const payment = await db.$transaction(async (tx) => {
      const lot = await tx.purchaseLot.findUnique({
        where: { id },
        select: { totalAmount: true, amountPaid: true },
      })

      if (!lot) {
        const e = new Error("Lot not found") as Error & { status: number }
        e.status = 404
        throw e
      }

      const newTotal = Number(lot.amountPaid) + Number(amount)
      if (newTotal > Number(lot.totalAmount)) {
        const remaining = Number(lot.totalAmount) - Number(lot.amountPaid)
        const e = new Error(
          `Payment would exceed total amount. Remaining: PKR ${remaining.toLocaleString()}`
        ) as Error & { status: number }
        e.status = 400
        throw e
      }

      const pmt = await tx.lotPayment.create({
        data: { lotId: id, amount: Number(amount), notes: notes?.trim() || null, recordedBy: user.id },
      })
      await tx.purchaseLot.update({
        where: { id },
        data: { amountPaid: newTotal },
      })
      return pmt
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 400) {
      return NextResponse.json({ error: (err as Error).message }, { status })
    }
    console.error("[POST /api/lots/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
