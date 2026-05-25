import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, phone, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Supplier name is required" }, { status: 400 })
  }

  const supplier = await db.supplier.update({
    where: { id },
    data: { name: name.trim(), phone: phone?.trim() || null, notes: notes?.trim() || null },
  })

  return NextResponse.json(supplier)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const lotsCount = await db.purchaseLot.count({ where: { supplierId: id } })
  if (lotsCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete supplier with existing purchase lots" },
      { status: 400 }
    )
  }

  await db.supplier.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
