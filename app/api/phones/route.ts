import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand, fromStorage, fromCondition, fromPtaStatus, toBrand, toStorage } from "@/lib/utils/enum-mappers"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() ?? ""
    const status = searchParams.get("status") ?? ""
    const brand = searchParams.get("brand") ?? ""
    const storage = searchParams.get("storage") ?? ""
    const model = searchParams.get("model") ?? ""
    const lotId = searchParams.get("lotId") ?? ""

    const where: Prisma.PhoneWhereInput = {}

    if (search) {
      const isDigitOnly = /^\d+$/.test(search)
      where.OR = [
        // IMEI search: if digits-only, use endsWith (last N digits match)
        // endsWith = LIKE '%value' which the DB can optimize for short suffix searches
        // vs contains = LIKE '%value%' which always full-scans
        isDigitOnly
          ? { imei: { endsWith: search } }
          : { imei: { contains: search } },
        { model: { contains: search, mode: "insensitive" } },
      ]
    }
    if (model) where.model = model
    if (status) where.status = status as Prisma.EnumPhoneStatusFilter["equals"]
    if (brand) where.brand = toBrand(brand) as Prisma.EnumBrandFilter["equals"]
    if (storage) where.storage = toStorage(storage) as Prisma.EnumStorageFilter["equals"]
    if (lotId) where.lotId = lotId

    const phones = await db.phone.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        lot: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(
      phones.map((p) => ({
        ...p,
        brand: fromBrand(p.brand),
        storage: fromStorage(p.storage),
        condition: fromCondition(p.condition),
        ptaStatus: fromPtaStatus(p.ptaStatus),
        costPrice: p.costPrice.toString(),
      }))
    )
  } catch (err) {
    console.error("[GET /api/phones]", err)
    return NextResponse.json({ error: "Failed to load phones" }, { status: 500 })
  }
}
