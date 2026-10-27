import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

// Delete a manual ledger entry — only allowed if nothing has been paid yet
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    // Conditional delete: only removes the row if amount_paid is still 0 at the moment of deletion,
    // so a payment recorded at the same time can never be wiped out.
    const result = await db.customerLedgerEntry.deleteMany({ where: { id, amountPaid: 0 } })

    if (result.count === 0) {
      const exists = await db.customerLedgerEntry.findUnique({ where: { id }, select: { id: true } })
      if (!exists) return NextResponse.json({ error: "Entry not found" }, { status: 404 })
      return NextResponse.json(
        { error: "Cannot delete an amount that has received payment" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/customers/entries/[id]]", err)
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 })
  }
}
