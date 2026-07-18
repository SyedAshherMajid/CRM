import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

// Distributes a bulk payment from a shop across pending sales (oldest first / FIFO)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { amount, notes } = body

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })

    const shop = await db.shopBuyer.findUnique({ where: { id }, select: { id: true } })
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 })

    // Fetch all outstanding items and distribute payment inside a single transaction
    // to prevent race conditions from concurrent payments.
    // Order: prior balances (oldest first), then phone sales (oldest first).
    await db.$transaction(async (tx) => {
      const [priorBalances, pendingSales] = await Promise.all([
        tx.shopPriorBalance.findMany({
          where: { shopBuyerId: id },
          orderBy: { createdAt: "asc" },
          select: { id: true, amount: true, amountPaid: true },
        }),
        tx.sale.findMany({
          where: { shopBuyerId: id, saleType: "shop" },
          orderBy: { soldAt: "asc" },
          select: { id: true, sellingPrice: true, amountReceived: true },
        }),
      ])

      const priorOutstanding = priorBalances.reduce(
        (sum, pb) => sum + (Number(pb.amount) - Number(pb.amountPaid)),
        0
      )
      const saleOutstanding = pendingSales.reduce(
        (sum, s) => sum + (Number(s.sellingPrice) - Number(s.amountReceived)),
        0
      )
      const totalOutstanding = priorOutstanding + saleOutstanding

      if (totalOutstanding <= 0) {
        const e = new Error("No outstanding balance for this shop") as Error & { status: number }
        e.status = 400
        throw e
      }

      let remaining = Math.min(Number(amount), totalOutstanding)

      // Step 1: Clear prior balances first (oldest first)
      for (const pb of priorBalances) {
        if (remaining <= 0) break
        const pbRemaining = Number(pb.amount) - Number(pb.amountPaid)
        if (pbRemaining <= 0) continue

        const applying = Math.min(remaining, pbRemaining)
        remaining -= applying

        await tx.shopPriorBalance.update({
          where: { id: pb.id },
          data: {
            amountPaid: Number(pb.amountPaid) + applying,
            ...(notes?.trim() && { paymentNotes: notes.trim() }),
          },
        })
      }

      // Step 2: Apply the rest to phone sales (oldest first)
      for (const sale of pendingSales) {
        if (remaining <= 0) break
        const pending = Number(sale.sellingPrice) - Number(sale.amountReceived)
        if (pending <= 0) continue

        const applying = Math.min(remaining, pending)
        remaining -= applying

        await tx.sale.update({
          where: { id: sale.id },
          data: { amountReceived: Number(sale.amountReceived) + applying },
        })
        await tx.salePayment.create({
          data: { saleId: sale.id, amount: applying, recordedBy: user.id, notes: notes?.trim() || null },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 400) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
    console.error("[POST /api/shops/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
