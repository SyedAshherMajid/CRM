import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

// Receive a payment against a specific prior balance
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; balanceId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id, balanceId } = await params
    const body = await req.json()
    const { amount, notes } = body

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })

    const updated = await db.$transaction(async (tx) => {
      const balance = await tx.shopPriorBalance.findUnique({
        where: { id: balanceId, shopBuyerId: id },
        select: { id: true, amount: true, amountPaid: true, description: true },
      })

      if (!balance) {
        const e = new Error("Balance not found") as Error & { status: number }
        e.status = 404
        throw e
      }

      const remaining = Number(balance.amount) - Number(balance.amountPaid)
      if (remaining <= 0) {
        const e = new Error("This balance is already fully paid") as Error & { status: number }
        e.status = 400
        throw e
      }

      const applying = Math.min(Number(amount), remaining)

      const updated = await tx.shopPriorBalance.update({
        where: { id: balanceId },
        data: {
          amountPaid: Number(balance.amountPaid) + applying,
          ...(notes?.trim() && { paymentNotes: notes.trim() }),
        },
      })

      // Log this payment for the payment history display
      await tx.shopPaymentLog.create({
        data: {
          shopBuyerId: id,
          amount: applying,
          notes: notes?.trim() || null,
          description: `Prior balance: ${balance.description}`,
          recordedBy: user.id,
        },
      })

      return updated
    })

    return NextResponse.json({
      id: updated.id,
      amount: Number(updated.amount),
      amountPaid: Number(updated.amountPaid),
    })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404) return NextResponse.json({ error: (err as Error).message }, { status: 404 })
    if (status === 400) return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    console.error("[PATCH /api/shops/[id]/prior-balances/[balanceId]]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}

// Delete a prior balance — only allowed if nothing has been paid yet
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; balanceId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id, balanceId } = await params

    const balance = await db.shopPriorBalance.findUnique({
      where: { id: balanceId, shopBuyerId: id },
      select: { id: true, amountPaid: true },
    })

    if (!balance) return NextResponse.json({ error: "Balance not found" }, { status: 404 })
    if (Number(balance.amountPaid) > 0) {
      return NextResponse.json(
        { error: "Cannot delete a balance that has received partial payment" },
        { status: 400 }
      )
    }

    await db.shopPriorBalance.delete({ where: { id: balanceId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/shops/[id]/prior-balances/[balanceId]]", err)
    return NextResponse.json({ error: "Failed to delete balance" }, { status: 500 })
  }
}
