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

    // Fetch pending sales AND distribute payment inside a single transaction so two
    // concurrent bulk payments cannot both read the same amountReceived values and
    // overwrite each other.
    await db.$transaction(async (tx) => {
      const pendingSales = await tx.sale.findMany({
        where: { shopBuyerId: id, saleType: "shop" },
        orderBy: { soldAt: "asc" },
        select: { id: true, sellingPrice: true, amountReceived: true },
      })

      const totalOutstanding = pendingSales.reduce(
        (sum, s) => sum + (Number(s.sellingPrice) - Number(s.amountReceived)),
        0
      )

      if (totalOutstanding <= 0) {
        const e = new Error("No outstanding balance for this shop") as Error & { status: number }
        e.status = 400
        throw e
      }

      let remaining = Math.min(Number(amount), totalOutstanding)

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
