import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { toBrand, toStorage, toCondition, toPtaStatus } from "@/lib/utils/enum-mappers"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const lots = await db.purchaseLot.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { phones: true } },
      },
    })

    // Count available and sold per lot using DB-side groupBy
    // This sends back 2-3 numbers per lot instead of fetching every phone row
    const phoneCounts = await db.phone.groupBy({
      by: ["lotId", "status"],
      _count: { id: true },
      where: { lotId: { in: lots.map((l) => l.id) } },
    })

    // Build a lookup map: { lotId: { available: N, sold: N } }
    const countMap = new Map<string, { available: number; sold: number }>()
    for (const row of phoneCounts) {
      if (!countMap.has(row.lotId)) countMap.set(row.lotId, { available: 0, sold: 0 })
      const entry = countMap.get(row.lotId)!
      if (row.status === "available") entry.available = row._count.id
      if (row.status === "sold") entry.sold = row._count.id
    }

    const result = lots.map((lot) => ({
      ...lot,
      totalAmount: lot.totalAmount.toString(),
      amountPaid: lot.amountPaid.toString(),
      availableCount: countMap.get(lot.id)?.available ?? 0,
      soldCount: countMap.get(lot.id)?.sold ?? 0,
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/lots]", err)
    return NextResponse.json({ error: "Failed to load lots" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, supplierId, totalAmount, amountPaid, notes, phones } = body

    if (!name?.trim())
      return NextResponse.json({ error: "Lot name is required" }, { status: 400 })
    if (!totalAmount || isNaN(Number(totalAmount)))
      return NextResponse.json({ error: "Total amount is required" }, { status: 400 })

    const imeis = (phones ?? []).map((p: { imei: string }) => p.imei).filter(Boolean)
    const uniqueImeis = new Set(imeis)
    if (uniqueImeis.size !== imeis.length)
      return NextResponse.json({ error: "Duplicate IMEI numbers in this submission" }, { status: 400 })

    // Map submitted IMEI → stored IMEI (adds #N suffix for re-purchased phones)
    const imeiToStored = new Map<string, string>()

    if (imeis.length > 0) {
      // Batch-fetch all existing records matching these IMEIs (exact or with re-purchase suffix)
      const existingPhones = await db.phone.findMany({
        where: {
          OR: [
            { imei: { in: imeis } },
            ...imeis.map((imei: string) => ({ imei: { startsWith: `${imei}#` } })),
          ],
        },
        select: { imei: true, status: true },
      })

      // Group by base IMEI (strip suffix)
      const byBase = new Map<string, Array<{ imei: string; status: string }>>()
      for (const p of existingPhones) {
        const base = p.imei.split("#")[0]
        if (!byBase.has(base)) byBase.set(base, [])
        byBase.get(base)!.push(p)
      }

      // Block if any submitted IMEI is already available in stock
      const conflictIMEI = imeis.find((imei: string) =>
        (byBase.get(imei) ?? []).some((p) => p.status === "available")
      )
      if (conflictIMEI) {
        return NextResponse.json(
          { error: `IMEI ${conflictIMEI} is already in stock` },
          { status: 400 }
        )
      }

      // Build stored IMEI for each submitted IMEI (adds #N for re-purchases)
      for (const imei of imeis) {
        const records = byBase.get(imei) ?? []
        if (records.length === 0) {
          imeiToStored.set(imei, imei)
        } else {
          let maxGen = 0
          for (const p of records) {
            if (p.imei === imei) maxGen = Math.max(maxGen, 1)
            const m = p.imei.match(/#(\d+)$/)
            if (m) maxGen = Math.max(maxGen, parseInt(m[1]))
          }
          imeiToStored.set(imei, `${imei}#${maxGen + 1}`)
        }
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
            condition: string; batteryHealth?: number; costPrice: number;
            imei: string; notes?: string; ptaStatus?: string
          }) => ({
            lotId: newLot.id,
            brand: toBrand(p.brand),
            model: p.model,
            storage: toStorage(p.storage),
            color: p.color,
            imei: imeiToStored.get(p.imei) ?? p.imei,
            condition: toCondition(p.condition),
            batteryHealth: p.batteryHealth || null,
            costPrice: Number(p.costPrice),
            ptaStatus: toPtaStatus(p.ptaStatus),
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
  } catch (err) {
    console.error("[POST /api/lots]", err)
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
