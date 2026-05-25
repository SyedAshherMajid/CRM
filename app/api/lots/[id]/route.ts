import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const lot = await db.purchaseLot.findUnique({
    where: { id },
    include: {
      supplier: true,
      payments: { orderBy: { paidAt: "desc" } },
      phones: {
        orderBy: [{ model: "asc" }, { createdAt: "asc" }],
        include: {
          sale: {
            select: { sellingPrice: true, amountReceived: true, saleType: true, shopBuyer: { select: { name: true } }, customerName: true }
          }
        }
      },
    },
  })

  if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 })

  return NextResponse.json(lot)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, notes } = body

  const lot = await db.purchaseLot.update({
    where: { id },
    data: { name: name?.trim(), notes: notes?.trim() || null },
  })

  return NextResponse.json(lot)
}
