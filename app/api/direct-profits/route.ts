import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const entries = await db.directProfit.findMany({
      orderBy: { profitDate: "desc" },
      take: 100,
      select: {
        id: true,
        amount: true,
        description: true,
        profitDate: true,
        createdAt: true,
        recorder: { select: { name: true } },
      },
    })

    return NextResponse.json(
      entries.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        description: e.description,
        profitDate: e.profitDate,
        createdAt: e.createdAt,
        recordedBy: e.recorder.name,
      }))
    )
  } catch (err) {
    console.error("[GET /api/direct-profits]", err)
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { amount, description, profitDate } = body

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    if (!description?.trim())
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    if (description.trim().length > 150)
      return NextResponse.json({ error: "Description must be 150 characters or less" }, { status: 400 })

    const date = profitDate
      ? new Date(profitDate + "T00:00:00+05:00")
      : new Date()

    const entry = await db.directProfit.create({
      data: {
        amount: Number(amount),
        description: description.trim(),
        profitDate: date,
        recordedBy: user.id,
      },
    })

    return NextResponse.json({ id: entry.id }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/direct-profits]", err)
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 })
  }
}
