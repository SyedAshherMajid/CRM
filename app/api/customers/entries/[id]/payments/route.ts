import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

// Receive a payment against a manual customer ledger entry
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { amount, notes } = body

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })

    const result = await db.$transaction(async (tx) => {
      const entry = await tx.customerLedgerEntry.findUnique({
        where: { id },
        select: { amount: true, amountPaid: true },
      })

      if (!entry) {
        const e = new Error("Entry not found") as Error & { status: number }
        e.status = 404
        throw e
      }

      const remaining = Number(entry.amount) - Number(entry.amountPaid)
      if (remaining <= 0) {
        const e = new Error("This amount is already fully paid") as Error & { status: number }
        e.status = 400
        throw e
      }

      const applying = Math.min(Number(amount), remaining)
      const newAmountPaid = Number(entry.amountPaid) + applying

      // Only update if amount_paid is unchanged since we read it — two payments recorded at the
      // same moment can never overwrite each other or push the entry past its total.
      const updated = await tx.customerLedgerEntry.updateMany({
        where: { id, amountPaid: entry.amountPaid },
        data: { amountPaid: newAmountPaid },
      })
      if (updated.count === 0) {
        const e = new Error("This amount was just updated by someone else. Please try again.") as Error & { status: number }
        e.status = 409
        throw e
      }

      await tx.customerLedgerPayment.create({
        data: { entryId: id, amount: applying, recordedBy: user.id, notes: notes?.trim() || null },
      })

      return { newAmountPaid }
    })

    return NextResponse.json({ success: true, newAmountPaid: result.newAmountPaid })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 400 || status === 409) {
      return NextResponse.json({ error: (err as Error).message }, { status })
    }
    console.error("[POST /api/customers/entries/[id]/payments]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
