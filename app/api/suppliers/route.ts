import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const suppliers = await db.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { lots: true } },
      lots: { select: { totalAmount: true, amountPaid: true } },
    },
  })

  return NextResponse.json(suppliers)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, phone, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Supplier name is required" }, { status: 400 })
  }

  const supplier = await db.supplier.create({
    data: { name: name.trim(), phone: phone?.trim() || null, notes: notes?.trim() || null },
  })

  return NextResponse.json(supplier, { status: 201 })
}
