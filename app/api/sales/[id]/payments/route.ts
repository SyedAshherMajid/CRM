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

    // Read, check, and write inside a single transaction so two concurrent payments
    // on the same sale cannot both read the same amountReceived and overwrite each other.
    const result = await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        select: { sellingPrice: true, amountReceived: true },
      })

      if (!sale) {
        const e = new Error("Sale not found") as Error & { status: number }
        e.status = 404
        throw e
      }

      const pending = Number(sale.sellingPrice) - Number(sale.amountReceived)
      if (pending <= 0) {
        const e = new Error("This sale is already fully paid") as Error & { status: number }
        e.status = 400
        throw e
      }

      const actualAmount = Math.min(Number(amount), pending)
      const newAmountReceived = Number(sale.amountReceived) + actualAmount

      await tx.sale.update({ where: { id }, data: { amountReceived: newAmountReceived } })
      await tx.salePayment.create({
        data: { saleId: id, amount: actualAmount, recordedBy: user.id, notes: notes?.trim() || null },
      })

      return { newAmountReceived }
    })

    return NextResponse.json({ success: true, newAmountReceived: result.newAmountReceived })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 400) {
      return NextResponse.json({ error: (err as Error).message }, { status })
    }
    console.error("[POST /api/sales/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
