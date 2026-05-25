import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lots = await db.purchaseLot.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { id: true, name: true } },
      _count: { select: { phones: true } },
      phones: {
        select: { status: true },
      },
    },
  })

  return NextResponse.json(lots)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, supplierId, totalAmount, amountPaid, notes, phones } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Lot name is required" }, { status: 400 })
  }
  if (!totalAmount || isNaN(Number(totalAmount))) {
    return NextResponse.json({ error: "Total amount is required" }, { status: 400 })
  }

  // Check for duplicate IMEIs within this submission
  const imeis = (phones ?? []).map((p: { imei: string }) => p.imei).filter(Boolean)
  const uniqueImeis = new Set(imeis)
  if (uniqueImeis.size !== imeis.length) {
    return NextResponse.json({ error: "Duplicate IMEI numbers found" }, { status: 400 })
  }

  // Check for IMEIs already in DB
  if (imeis.length > 0) {
    const existing = await db.phone.findFirst({ where: { imei: { in: imeis } } })
    if (existing) {
      return NextResponse.json(
        { error: `IMEI ${existing.imei} already exists in the system` },
        { status: 400 }
      )
    }
  }

  const paid = Number(amountPaid) || 0

  const lot = await db.$transaction(async (tx) => {
    const newLot = await tx.purchaseLot.create({
      data: {
        name: name.trim(),
        supplierId: supplierId || null,
        totalAmount: Number(totalAmount),
        amountPaid: paid,
        notes: notes?.trim() || null,
        createdBy: user.id,
      },
    })

    if (phones && phones.length > 0) {
      await tx.phone.createMany({
        data: phones.map((p: {
          brand: string; model: string; storage: string; color: string;
          condition: string; batteryHealth?: number; costPrice: number; imei: string; notes?: string
        }) => ({
          lotId: newLot.id,
          brand: p.brand,
          model: p.model,
          storage: p.storage,
          color: p.color,
          imei: p.imei,
          condition: p.condition,
          batteryHealth: p.batteryHealth || null,
          costPrice: Number(p.costPrice),
          notes: p.notes || null,
          addedBy: user.id,
        })),
      })
    }

    if (paid > 0) {
      await tx.lotPayment.create({
        data: { lotId: newLot.id, amount: paid, recordedBy: user.id, notes: "Initial payment" },
      })
    }

    return newLot
  })

  return NextResponse.json(lot, { status: 201 })
}
