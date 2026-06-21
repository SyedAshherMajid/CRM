import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { get1010MonthRange } from "@/lib/utils/month-cycle"
import { ExpenseCategory } from "@prisma/client"

const VALID_CATEGORIES = ["Rent", "Electricity", "Internet", "Food", "Salary", "Transport", "Other"]

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get("timeframe") || "month"
    const dateStr = searchParams.get("date")
    const targetDate = dateStr ? new Date(dateStr) : new Date()

    let start: Date, end: Date
    if (timeframe === "all") {
      start = new Date("2000-01-01")
      end = new Date()
    } else {
      const range = get1010MonthRange(targetDate)
      start = range.start
      end = range.end
    }

    const expenses = await db.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      orderBy: { expenseDate: "desc" },
      include: { recorder: { select: { name: true } } },
    })

    return NextResponse.json(
      expenses.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        category: e.category,
        description: e.description,
        expenseDate: e.expenseDate,
        notes: e.notes,
        recordedBy: e.recorder.name,
      }))
    )
  } catch (err) {
    console.error("[GET /api/expenses]", err)
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { amount, category, description, expenseDate, notes } = body

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    if (!category || !VALID_CATEGORIES.includes(category))
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    if (!description?.trim())
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    if (!expenseDate)
      return NextResponse.json({ error: "Date is required" }, { status: 400 })

    const expense = await db.expense.create({
      data: {
        amount: Number(amount),
        category: category as ExpenseCategory,
        description: description.trim(),
        expenseDate: new Date(expenseDate),
        notes: notes?.trim() || null,
        recordedBy: user.id,
      },
    })

    return NextResponse.json({ ...expense, amount: Number(expense.amount) }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/expenses]", err)
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 })
  }
}
