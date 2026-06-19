import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        lots: {
          include: { payments: true, _count: { select: { phones: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    // Get all lot payments for this supplier
    const allLotPayments = await db.lotPayment.findMany({
      where: { lot: { supplierId: id } },
      orderBy: { paidAt: "desc" },
    })

    // Get all direct supplier payments
    const allSupplierPayments = await db.supplierPayment.findMany({
      where: { supplierId: id },
      orderBy: { paidAt: "desc" },
    })

    // Combine and sort payments by date
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

    // Count phones per lot
    const lotsWithPhoneCounts = await Promise.all(
      supplier.lots.map(async (lot) => {
        const total = await db.phone.count({ where: { lotId: lot.id } })
        const sold = await db.phone.count({ where: { lotId: lot.id, status: "sold" } })
        return { ...lot, phonesCount: total, phonesSold: sold }
      })
    )

    return NextResponse.json({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      notes: supplier.notes,
      totalOwed: supplier.lots.reduce((sum, lot) => sum + (lot.totalAmount as any).toNumber(), 0),
      allPayments,
      lots: lotsWithPhoneCounts.map((lot) => ({
        id: lot.id,
        name: lot.name,
        totalAmount: lot.totalAmount,
        amountPaid: lot.amountPaid,
        notes: lot.notes,
        phonesCount: lot.phonesCount,
        phonesSold: lot.phonesSold,
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
