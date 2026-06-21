import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Parallel: supplier rows + payment-aware aggregates per supplier
  const [suppliers, balanceStats] = await Promise.all([
    db.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    db.$queryRaw<Array<{
      supplier_id: string
      lots_count: bigint
      total_amount: string
      amount_paid: string
      direct_paid: string
    }>>`
      WITH lot_stats AS (
        SELECT
          supplier_id,
          COUNT(*)::bigint                     AS lots_count,
          COALESCE(SUM(total_amount), 0)       AS total_amount,
          COALESCE(SUM(amount_paid), 0)        AS amount_paid
        FROM purchase_lots
        WHERE supplier_id IS NOT NULL
        GROUP BY supplier_id
      ),
      direct_stats AS (
        SELECT
          supplier_id,
          COALESCE(SUM(amount), 0)             AS direct_paid
        FROM supplier_payments
        GROUP BY supplier_id
      )
      SELECT
        COALESCE(l.supplier_id, d.supplier_id)    AS supplier_id,
        COALESCE(l.lots_count, 0)::bigint         AS lots_count,
        COALESCE(l.total_amount, 0)::text         AS total_amount,
        COALESCE(l.amount_paid, 0)::text          AS amount_paid,
        COALESCE(d.direct_paid, 0)::text          AS direct_paid
      FROM lot_stats l
      FULL OUTER JOIN direct_stats d ON d.supplier_id = l.supplier_id
    `,
  ])

  const statsMap = new Map(balanceStats.map((s) => [s.supplier_id, s]))

  return NextResponse.json(
    suppliers.map((s) => {
      const stats = statsMap.get(s.id)
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        lotsCount: stats ? Number(stats.lots_count) : 0,
        totalAmountOwed: stats
          ? Math.max(0, Number(stats.total_amount) - Number(stats.amount_paid) - Number(stats.direct_paid))
          : 0,
      }
    })
  )
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, phone, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Supplier name is required" }, { status: 400 })
  }

  const supplier = await db.supplier.create({
    data: { name: name.trim(), phone: phone?.trim() || null, notes: notes?.trim() || null },
  })

  return NextResponse.json(
    {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      lotsCount: 0,
      totalAmountOwed: 0,
    },
    { status: 201 }
  )
}
