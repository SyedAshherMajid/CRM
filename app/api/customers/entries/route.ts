import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

// Add a manual amount to a customer's ledger (works like a shop prior balance)
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { customerName, amount, description, entryDate } = body

    if (!customerName?.trim())
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 })
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    if (Number(amount) > 9_999_999_999)
      return NextResponse.json({ error: "Amount is too large" }, { status: 400 })
    if (!description?.trim())
      return NextResponse.json({ error: "Please write what this amount is for" }, { status: 400 })
    if (description.trim().length > 150)
      return NextResponse.json({ error: "Description must be 150 characters or less" }, { status: 400 })

    // Optional date (sent as "YYYY-MM-DD", interpreted as PKT midnight)
    let date: Date | undefined
    if (entryDate) {
      date = new Date(`${entryDate}T00:00:00+05:00`)
      if (isNaN(date.getTime()))
        return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    }

    const entry = await db.customerLedgerEntry.create({
      data: {
        customerName: customerName.trim(),
        amount: Number(amount),
        description: description.trim(),
        recordedBy: user.id,
        ...(date && { entryDate: date }),
      },
    })

    return NextResponse.json(
      {
        id: entry.id,
        customerName: entry.customerName,
        amount: Number(entry.amount),
        amountPaid: Number(entry.amountPaid),
        description: entry.description,
        entryDate: entry.entryDate,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/customers/entries]", err)
    return NextResponse.json({ error: "Failed to add amount" }, { status: 500 })
  }
}
