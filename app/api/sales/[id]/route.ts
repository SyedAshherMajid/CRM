import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const sale = await db.sale.findUnique({
      where: { id },
      select: { id: true, phoneId: true },
    })

    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 })

    // Delete sale (SalePayments cascade via FK) and reset phone to available — atomically
    await db.$transaction([
      db.sale.delete({ where: { id } }),
      db.phone.update({ where: { id: sale.phoneId }, data: { status: "available" } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/sales/[id]]", err)
    return NextResponse.json({ error: "Failed to return sale" }, { status: 500 })
  }
}
