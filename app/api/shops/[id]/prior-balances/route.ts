import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { amount, description } = body

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    if (!description?.trim())
      return NextResponse.json({ error: "Description is required" }, { status: 400 })

    const shop = await db.shopBuyer.findUnique({ where: { id }, select: { id: true } })
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 })

    const balance = await db.shopPriorBalance.create({
      data: {
        shopBuyerId: id,
        amount: Number(amount),
        description: description.trim(),
        recordedBy: user.id,
      },
    })

    return NextResponse.json(
      {
        id: balance.id,
        shopBuyerId: balance.shopBuyerId,
        amount: Number(balance.amount),
        amountPaid: Number(balance.amountPaid),
        description: balance.description,
        createdAt: balance.createdAt,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/shops/[id]/prior-balances]", err)
    return NextResponse.json({ error: "Failed to add prior balance" }, { status: 500 })
  }
}
