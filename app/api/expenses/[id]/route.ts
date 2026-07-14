import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { ExpenseCategory } from "@prisma/client"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { amount, category, description, expenseDate, notes } = body

    const expense = await db.expense.findUnique({ where: { id } })
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    const updated = await db.expense.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(category !== undefined && { category: category as ExpenseCategory }),
        ...(description !== undefined && { description: description.trim() }),
        ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: { recorder: { select: { name: true } } },
    })

    return NextResponse.json({
      id: updated.id,
      amount: Number(updated.amount),
      category: updated.category,
      description: updated.description,
      expenseDate: updated.expenseDate.toISOString().split("T")[0],
      notes: updated.notes,
      recordedBy: updated.recorder.name,
    })
  } catch (err) {
    console.error("[PATCH /api/expenses/[id]]", err)
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 })
  }
}

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
