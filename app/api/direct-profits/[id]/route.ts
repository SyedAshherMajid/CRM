import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const entry = await db.directProfit.findUnique({ where: { id }, select: { id: true } })
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 })

    await db.directProfit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/direct-profits/[id]]", err)
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 })
  }
}
