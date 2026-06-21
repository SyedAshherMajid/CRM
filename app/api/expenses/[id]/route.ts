import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const expense = await db.expense.findUnique({ where: { id } })
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    await db.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/expenses/[id]]", err)
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 })
  }
}
