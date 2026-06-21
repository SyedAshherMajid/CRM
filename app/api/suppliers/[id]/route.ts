import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    // Round 1: supplier + all its lots (needed before we can query phone counts)
    // + lot payments + supplier payments all run in parallel
    const [supplier, allLotPayments, allSupplierPayments] = await Promise.all([
      db.supplier.findUnique({
        where: { id },
        include: {
          lots: {
            include: { payments: true, _count: { select: { phones: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      // Direct lot payments for this supplier's lots
      db.lotPayment.findMany({
        where: { lot: { supplierId: id } },
        orderBy: { paidAt: "desc" },
      }),
      // Direct supplier payments
      db.supplierPayment.findMany({
        where: { supplierId: id },
        orderBy: { paidAt: "desc" },
      }),
    ])

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    // Round 2: single groupBy replaces the N+1 loop (was 2 × lots.length queries)
    // Gets all phone counts for all lots in ONE query regardless of lot count
    const phoneCounts = await db.phone.groupBy({
      by: ["lotId", "status"],
      _count: { id: true },
      where: { lotId: { in: supplier.lots.map((l) => l.id) } },
    })

    // Build lookup map: { lotId → { total, sold } }
    const countMap = new Map<string, { total: number; sold: number }>()
    for (const row of phoneCounts) {
      if (!countMap.has(row.lotId)) countMap.set(row.lotId, { total: 0, sold: 0 })
      const entry = countMap.get(row.lotId)!
      entry.total += row._count.id
      if (row.status === "sold") entry.sold = row._count.id
    }

    const totalLotAmount = supplier.lots.reduce((sum, lot) => sum + lot.totalAmount.toNumber(), 0)
    const totalLotPaid = supplier.lots.reduce((sum, lot) => sum + lot.amountPaid.toNumber(), 0)
    const totalDirectPaid = allSupplierPayments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)
    const remainingOwed = Math.max(0, totalLotAmount - totalLotPaid - totalDirectPaid)

    // Combine and sort all payment types by date
    const allPayments = [
      ...allLotPayments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        paidAt: p.paidAt,
        notes: p.notes,
        type: "lot",
      })),
      ...allSupplierPayments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        paidAt: p.paidAt,
        notes: p.notes,
        type: "direct",
      })),
    ].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())

    return NextResponse.json({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      notes: supplier.notes,
      totalOwed: remainingOwed,
      totalLotAmount,
      totalLotPaid,
      totalDirectPaid,
      allPayments,
      lots: supplier.lots.map((lot) => ({
        id: lot.id,
        name: lot.name,
        totalAmount: lot.totalAmount.toString(),
        amountPaid: lot.amountPaid.toString(),
        notes: lot.notes,
        phonesCount: countMap.get(lot.id)?.total ?? 0,
        phonesSold: countMap.get(lot.id)?.sold ?? 0,
        payments: lot.payments.map((p) => ({
          id: p.id,
          amount: p.amount.toString(),
          paidAt: p.paidAt,
          notes: p.notes,
        })),
      })),
    })
  } catch (err) {
    console.error("[GET /api/suppliers/[id]]", err)
    return NextResponse.json({ error: "Failed to load supplier" }, { status: 500 })
  }
}

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
