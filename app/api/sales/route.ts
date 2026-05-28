import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand, fromStorage } from "@/lib/utils/enum-mappers"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sales = await db.sale.findMany({
      orderBy: { soldAt: "desc" },
      take: 20,
      include: {
        phone: {
          select: { brand: true, model: true, storage: true, color: true, costPrice: true },
        },
        shopBuyer: { select: { id: true, name: true } },
        seller: { select: { name: true } },
      },
    })

    return NextResponse.json(
      sales.map((s) => ({
        ...s,
        sellingPrice: s.sellingPrice.toString(),
        amountReceived: s.amountReceived.toString(),
        phone: {
          ...s.phone,
          brand: fromBrand(s.phone.brand),
          storage: fromStorage(s.phone.storage),
          costPrice: s.phone.costPrice.toString(),
        },
      }))
    )
  } catch (err) {
    console.error("[GET /api/sales]", err)
    return NextResponse.json({ error: "Failed to load sales" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { saleType } = body

    if (saleType === "customer") {
      const { phoneId, customerName, sellingPrice, amountReceived, notes } = body

      if (!phoneId || !sellingPrice)
        return NextResponse.json({ error: "Phone and selling price are required" }, { status: 400 })

      const phone = await db.phone.findUnique({ where: { id: phoneId }, select: { status: true } })
      if (!phone || phone.status !== "available")
        return NextResponse.json({ error: "Phone is not available for sale" }, { status: 400 })

      const received = Number(amountReceived) || 0

      const sale = await db.$transaction(async (tx) => {
        const newSale = await tx.sale.create({
          data: {
            phoneId,
            saleType: "customer",
            customerName: customerName?.trim() || null,
            sellingPrice: Number(sellingPrice),
            amountReceived: received,
            notes: notes?.trim() || null,
            soldBy: user.id,
          },
        })
        await tx.phone.update({ where: { id: phoneId }, data: { status: "sold" } })
        if (received > 0) {
          await tx.salePayment.create({
            data: { saleId: newSale.id, amount: received, recordedBy: user.id, notes: "Initial payment" },
          })
        }
        return newSale
      })

      return NextResponse.json(sale, { status: 201 })

    } else if (saleType === "shop") {
      const { shopBuyerId, phones, amountReceived, notes } = body

      if (!shopBuyerId || !phones?.length)
        return NextResponse.json({ error: "Shop and at least one phone are required" }, { status: 400 })

      const phoneIds = phones.map((p: { phoneId: string }) => p.phoneId)
      const existing = await db.phone.findMany({
        where: { id: { in: phoneIds } },
        select: { id: true, status: true },
      })
      const unavailable = existing.filter((p) => p.status !== "available")
      if (unavailable.length > 0)
        return NextResponse.json({ error: "One or more phones are no longer available" }, { status: 400 })

      let remainingPayment = Number(amountReceived) || 0

      const sales = await db.$transaction(async (tx) => {
        const created = []
        for (const p of phones) {
          const phonePrice = Number(p.sellingPrice)
          const phoneReceived = Math.min(remainingPayment, phonePrice)
          remainingPayment -= phoneReceived

          const newSale = await tx.sale.create({
            data: {
              phoneId: p.phoneId,
              saleType: "shop",
              shopBuyerId,
              sellingPrice: phonePrice,
              amountReceived: phoneReceived,
              notes: notes?.trim() || null,
              soldBy: user.id,
            },
          })
          await tx.phone.update({ where: { id: p.phoneId }, data: { status: "sold" } })
          if (phoneReceived > 0) {
            await tx.salePayment.create({
              data: { saleId: newSale.id, amount: phoneReceived, recordedBy: user.id, notes: "Initial payment" },
            })
          }
          created.push(newSale)
        }
        return created
      })

      return NextResponse.json(sales, { status: 201 })

    } else {
      return NextResponse.json({ error: "Invalid sale type" }, { status: 400 })
    }
  } catch (err) {
    console.error("[POST /api/sales]", err)
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
