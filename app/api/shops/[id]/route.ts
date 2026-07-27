import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand, fromStorage, fromCondition } from "@/lib/utils/enum-mappers"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    // All 4 queries run in parallel
    const [shop, outstandingAgg, allPayments, priorBalances] = await Promise.all([
      // Shop info + sales list (capped at 100 most recent)
      db.shopBuyer.findUnique({
        where: { id },
        include: {
          sales: {
            orderBy: { soldAt: "desc" },
            take: 100,
            include: {
              phone: {
                select: {
                  id: true, brand: true, model: true, storage: true,
                  color: true, imei: true, costPrice: true,
                  lot: { select: { id: true, name: true } },
                },
              },
              payments: { orderBy: { receivedAt: "desc" } },
            },
          },
        },
      }),

      // Outstanding balance via DB aggregate — no need to load all sales just to sum them
      db.sale.aggregate({
        where: { shopBuyerId: id },
        _sum: { sellingPrice: true, amountReceived: true },
      }),

      // Payment history — from ShopPaymentLog so all payment types are included
      db.shopPaymentLog.findMany({
        where: { shopBuyerId: id },
        orderBy: { receivedAt: "desc" },
        take: 500,
        select: { id: true, amount: true, receivedAt: true, notes: true, description: true },
      }),

      // Prior balances (historical debts not linked to specific phones)
      db.shopPriorBalance.findMany({
        where: { shopBuyerId: id },
        orderBy: { createdAt: "asc" },
        select: { id: true, amount: true, amountPaid: true, description: true, createdAt: true, paymentNotes: true },
      }),
    ])

    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 })

    const saleOutstanding =
      (outstandingAgg._sum.sellingPrice?.toNumber() ?? 0) -
      (outstandingAgg._sum.amountReceived?.toNumber() ?? 0)
    const priorBalanceOutstanding = priorBalances.reduce(
      (sum, pb) => sum + Number(pb.amount) - Number(pb.amountPaid),
      0
    )
    const outstanding = saleOutstanding + priorBalanceOutstanding

    return NextResponse.json({
      ...shop,
      outstanding,
      saleOutstanding,
      priorBalances: priorBalances.map((pb) => ({
        id: pb.id,
        amount: Number(pb.amount),
        amountPaid: Number(pb.amountPaid),
        description: pb.description,
        createdAt: pb.createdAt,
        paymentNotes: pb.paymentNotes ?? null,
      })),
      allPayments: allPayments.map((p) => ({ ...p, amount: p.amount.toString() })),
      sales: shop.sales.map((s) => ({
        ...s,
        sellingPrice: s.sellingPrice.toString(),
        amountReceived: s.amountReceived.toString(),
        phone: {
          ...s.phone,
          brand: fromBrand(s.phone.brand),
          storage: fromStorage(s.phone.storage),
          costPrice: s.phone.costPrice.toString(),
        },
        payments: s.payments.map((p) => ({ ...p, amount: p.amount.toString() })),
      })),
    })
  } catch (err) {
    console.error("[GET /api/shops/[id]]", err)
    return NextResponse.json({ error: "Failed to load shop" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const hasSales = await db.sale.count({ where: { shopBuyerId: id } })
    if (hasSales > 0) {
      return NextResponse.json(
        { error: "Cannot delete a shop that has sales history. Sales records must be preserved." },
        { status: 400 }
      )
    }

    await db.shopBuyer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/shops/[id]]", err)
    return NextResponse.json({ error: "Failed to delete shop" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { name, phone, address, notes } = body

    if (name !== undefined && !name.trim())
      return NextResponse.json({ error: "Shop name cannot be empty" }, { status: 400 })

    const shop = await db.shopBuyer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() || null }),
        ...(address !== undefined && { address: address.trim() || null }),
        ...(notes !== undefined && { notes: notes.trim() || null }),
      },
    })

    return NextResponse.json(shop)
  } catch (err) {
    console.error("[PATCH /api/shops/[id]]", err)
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 })
  }
}
