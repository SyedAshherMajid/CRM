import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

// Distributes a bulk payment from a shop across pending items (FIFO: prior balances → phone sales → accessory sales, oldest first each)
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

    await db.$transaction(async (tx) => {
      const [priorBalances, pendingSales, pendingAccessorySales] = await Promise.all([
        tx.shopPriorBalance.findMany({
          where: { shopBuyerId: id },
          orderBy: { createdAt: "asc" },
          select: { id: true, amount: true, amountPaid: true, description: true },
        }),
        tx.sale.findMany({
          where: { shopBuyerId: id, saleType: "shop" },
          orderBy: { soldAt: "asc" },
          select: {
            id: true, sellingPrice: true, amountReceived: true,
            phone: { select: { model: true, storage: true } },
          },
        }),
        tx.accessorySale.findMany({
          where: { shopBuyerId: id, saleType: "shop" },
          orderBy: { soldAt: "asc" },
          select: {
            id: true, totalSellingPrice: true, amountReceived: true,
            lot: { select: { name: true } }, quantity: true,
          },
        }),
      ])

      const priorOutstanding = priorBalances.reduce(
        (sum, pb) => sum + (Number(pb.amount) - Number(pb.amountPaid)), 0
      )
      const saleOutstanding = pendingSales.reduce(
        (sum, s) => sum + (Number(s.sellingPrice) - Number(s.amountReceived)), 0
      )
      const accessoryOutstanding = pendingAccessorySales.reduce(
        (sum, s) => sum + (Number(s.totalSellingPrice) - Number(s.amountReceived)), 0
      )
      const totalOutstanding = priorOutstanding + saleOutstanding + accessoryOutstanding

      if (totalOutstanding <= 0) {
        const e = new Error("No outstanding balance for this shop") as Error & { status: number }
        e.status = 400
        throw e
      }

      let remaining = Math.min(Number(amount), totalOutstanding)
      const appliedTotal = remaining

      // Track what was applied for the description
      const descParts: string[] = []
      let priorApplied = 0
      const phonesApplied: string[] = []
      const accessoriesApplied: string[] = []

      // Step 1: Clear prior balances first (oldest first)
      for (const pb of priorBalances) {
        if (remaining <= 0) break
        const pbRemaining = Number(pb.amount) - Number(pb.amountPaid)
        if (pbRemaining <= 0) continue

        const applying = Math.min(remaining, pbRemaining)
        remaining -= applying
        priorApplied += applying

        await tx.shopPriorBalance.update({
          where: { id: pb.id },
          data: {
            amountPaid: Number(pb.amountPaid) + applying,
            ...(notes?.trim() && { paymentNotes: notes.trim() }),
          },
        })
      }

      if (priorApplied > 0) descParts.push("Prior balance")

      // Step 2: Apply to phone sales (oldest first)
      for (const sale of pendingSales) {
        if (remaining <= 0) break
        const pending = Number(sale.sellingPrice) - Number(sale.amountReceived)
        if (pending <= 0) continue

        const applying = Math.min(remaining, pending)
        remaining -= applying
        phonesApplied.push(`${sale.phone.model} (${sale.phone.storage})`)

        await tx.sale.update({
          where: { id: sale.id },
          data: { amountReceived: Number(sale.amountReceived) + applying },
        })
        await tx.salePayment.create({
          data: { saleId: sale.id, amount: applying, recordedBy: user.id, notes: notes?.trim() || null },
        })
      }

      if (phonesApplied.length === 1) {
        descParts.push(`Phone: ${phonesApplied[0]}`)
      } else if (phonesApplied.length > 1) {
        descParts.push(`${phonesApplied.length} phones`)
      }

      // Step 3: Apply to accessory sales (oldest first)
      for (const sale of pendingAccessorySales) {
        if (remaining <= 0) break
        const pending = Number(sale.totalSellingPrice) - Number(sale.amountReceived)
        if (pending <= 0) continue

        const applying = Math.min(remaining, pending)
        remaining -= applying
        accessoriesApplied.push(`${sale.lot.name} ×${sale.quantity}`)

        await tx.accessorySale.update({
          where: { id: sale.id },
          data: { amountReceived: Number(sale.amountReceived) + applying },
        })
        await tx.accessorySalePayment.create({
          data: { saleId: sale.id, amount: applying, recordedBy: user.id, notes: notes?.trim() || null },
        })
      }

      if (accessoriesApplied.length === 1) {
        descParts.push(`Accessory: ${accessoriesApplied[0]}`)
      } else if (accessoriesApplied.length > 1) {
        descParts.push(`${accessoriesApplied.length} accessory sales`)
      }

      // Log this payment event for the payment history display
      await tx.shopPaymentLog.create({
        data: {
          shopBuyerId: id,
          amount: appliedTotal,
          notes: notes?.trim() || null,
          description: descParts.join(" + ") || null,
          recordedBy: user.id,
        },
      })
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
