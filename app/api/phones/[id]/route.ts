import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand, fromStorage, fromCondition, fromPtaStatus, toCondition } from "@/lib/utils/enum-mappers"
import { Condition, PhoneStatus, Prisma } from "@prisma/client"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const phone = await db.phone.findUnique({
      where: { id },
      include: {
        lot: { select: { id: true, name: true, supplier: { select: { name: true } } } },
        adder: { select: { name: true } },
        sale: {
          include: {
            shopBuyer: { select: { id: true, name: true } },
            payments: { orderBy: { receivedAt: "desc" } },
          },
        },
      },
    })

    if (!phone) return NextResponse.json({ error: "Phone not found" }, { status: 404 })

    return NextResponse.json({
      ...phone,
      brand: fromBrand(phone.brand),
      storage: fromStorage(phone.storage),
      condition: fromCondition(phone.condition),
      ptaStatus: fromPtaStatus(phone.ptaStatus),
      costPrice: phone.costPrice.toString(),
      sale: phone.sale
        ? {
            ...phone.sale,
            sellingPrice: phone.sale.sellingPrice.toString(),
            amountReceived: phone.sale.amountReceived.toString(),
            payments: phone.sale.payments.map((p) => ({ ...p, amount: p.amount.toString() })),
          }
        : null,
    })
  } catch (err) {
    console.error("[GET /api/phones/[id]]", err)
    return NextResponse.json({ error: "Failed to load phone" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const existing = await db.phone.findUnique({ where: { id }, select: { status: true } })
    if (!existing) return NextResponse.json({ error: "Phone not found" }, { status: 404 })

    if (body.status !== undefined && existing.status === "sold") {
      return NextResponse.json({ error: "Cannot change status of a sold phone" }, { status: 400 })
    }

    const data: Prisma.PhoneUpdateInput = {}
    if (body.color !== undefined) data.color = body.color.trim()
    if (body.condition !== undefined) data.condition = toCondition(body.condition) as Condition
    if ("batteryHealth" in body) data.batteryHealth = body.batteryHealth || null
    if ("notes" in body) data.notes = body.notes?.trim() || null
    if (body.status !== undefined) data.status = body.status as PhoneStatus

    const updated = await db.phone.update({ where: { id }, data })

    return NextResponse.json({
      ...updated,
      brand: fromBrand(updated.brand),
      storage: fromStorage(updated.storage),
      condition: fromCondition(updated.condition),
      ptaStatus: fromPtaStatus(updated.ptaStatus),
      costPrice: updated.costPrice.toString(),
    })
  } catch (err) {
    console.error("[PATCH /api/phones/[id]]", err)
    return NextResponse.json({ error: "Failed to update phone" }, { status: 500 })
  }
}
