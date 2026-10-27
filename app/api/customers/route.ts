import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { fromBrand } from "@/lib/utils/enum-mappers"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name")

    // ── Detail mode: return all sales for a named customer ──────────────────
    if (name) {
      const [sales, entries] = await Promise.all([
        db.sale.findMany({
          where: { saleType: "customer", customerName: name },
          select: {
            id: true,
            sellingPrice: true,
            amountReceived: true,
            soldAt: true,
            notes: true,
            phone: {
              select: {
                id: true,
                brand: true,
                model: true,
                storage: true,
                color: true,
                imei: true,
                costPrice: true,
                lot: { select: { id: true, name: true } },
              },
            },
            payments: {
              select: { id: true, amount: true, receivedAt: true, notes: true },
              orderBy: { receivedAt: "desc" },
            },
          },
          orderBy: { soldAt: "desc" },
        }),
        // Manual amounts added to this customer's ledger
        db.customerLedgerEntry.findMany({
          where: { customerName: name },
          select: {
            id: true,
            amount: true,
            amountPaid: true,
            description: true,
            entryDate: true,
            recorder: { select: { name: true } },
            payments: {
              select: { id: true, amount: true, receivedAt: true, notes: true },
              orderBy: { receivedAt: "desc" },
            },
          },
          orderBy: { entryDate: "desc" },
        }),
      ])

      const salesOutstanding = sales.reduce(
        (sum, s) => sum + (Number(s.sellingPrice) - Number(s.amountReceived)),
        0
      )
      const entriesOutstanding = entries.reduce(
        (sum, e) => sum + (Number(e.amount) - Number(e.amountPaid)),
        0
      )
      const outstanding = salesOutstanding + entriesOutstanding

      return NextResponse.json({
        name,
        outstanding,
        entries: entries.map((e) => ({
          id: e.id,
          amount: Number(e.amount),
          amountPaid: Number(e.amountPaid),
          pending: Number(e.amount) - Number(e.amountPaid),
          description: e.description,
          entryDate: e.entryDate,
          recordedBy: e.recorder.name,
          payments: e.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            receivedAt: p.receivedAt,
            notes: p.notes,
          })),
        })),
        sales: sales.map((s) => ({
          id: s.id,
          sellingPrice: Number(s.sellingPrice),
          amountReceived: Number(s.amountReceived),
          pending: Number(s.sellingPrice) - Number(s.amountReceived),
          soldAt: s.soldAt,
          notes: s.notes,
          phone: {
            id: s.phone.id,
            brand: fromBrand(s.phone.brand),
            model: s.phone.model,
            storage: s.phone.storage,
            color: s.phone.color,
            imei: s.phone.imei,
            costPrice: Number(s.phone.costPrice),
            lotId: s.phone.lot.id,
            lotName: s.phone.lot.name,
          },
          payments: s.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            receivedAt: p.receivedAt,
            notes: p.notes,
          })),
        })),
      })
    }

    // ── List mode: return all customers (from sales + manual ledger entries + manually added contacts) ─
    const [rows, entryRows, contacts] = await Promise.all([
      db.$queryRaw<
        Array<{
          customer_name: string
          total_selling: string
          total_received: string
          total_sales: bigint
          pending_count: bigint
          last_sale_at: Date | null
        }>
      >`
        SELECT
          customer_name,
          COALESCE(SUM(selling_price), 0)::text              AS total_selling,
          COALESCE(SUM(amount_received), 0)::text            AS total_received,
          COUNT(*)::bigint                                    AS total_sales,
          COUNT(*) FILTER (WHERE selling_price > amount_received)::bigint AS pending_count,
          MAX(sold_at)                                        AS last_sale_at
        FROM sales
        WHERE sale_type = 'customer'
          AND customer_name IS NOT NULL
          AND customer_name != ''
        GROUP BY customer_name
      `,
      db.$queryRaw<
        Array<{
          customer_name: string
          total_amount: string
          total_paid: string
          total_entries: bigint
          pending_count: bigint
          last_entry_at: Date | null
        }>
      >`
        SELECT
          customer_name,
          COALESCE(SUM(amount), 0)::text                      AS total_amount,
          COALESCE(SUM(amount_paid), 0)::text                 AS total_paid,
          COUNT(*)::bigint                                    AS total_entries,
          COUNT(*) FILTER (WHERE amount > amount_paid)::bigint AS pending_count,
          MAX(entry_date)                                     AS last_entry_at
        FROM customer_ledger_entries
        GROUP BY customer_name
      `,
      db.customerContact.findMany({ orderBy: { name: "asc" } }),
    ])

    // Build map from sales data
    const saleMap = new Map(
      rows.map((r) => [
        r.customer_name,
        {
          outstanding: Number(r.total_selling) - Number(r.total_received),
          pendingCount: Number(r.pending_count),
          totalSales: Number(r.total_sales),
          lastSaleAt: r.last_sale_at,
        },
      ])
    )

    // Build map from manual ledger entries
    const entryMap = new Map(
      entryRows.map((r) => [
        r.customer_name,
        {
          outstanding: Number(r.total_amount) - Number(r.total_paid),
          pendingCount: Number(r.pending_count),
          totalEntries: Number(r.total_entries),
          lastEntryAt: r.last_entry_at,
        },
      ])
    )

    // Merge: sales-derived names + ledger entry names + manually-added contacts (deduped by name)
    const allNames = new Set([...saleMap.keys(), ...entryMap.keys(), ...contacts.map((c) => c.name)])

    const result = Array.from(allNames)
      .map((name) => {
        const sale = saleMap.get(name)
        const entry = entryMap.get(name)
        const lastDates = [sale?.lastSaleAt, entry?.lastEntryAt].filter((d): d is Date => !!d)
        return {
          name,
          outstanding: (sale?.outstanding ?? 0) + (entry?.outstanding ?? 0),
          pendingCount: (sale?.pendingCount ?? 0) + (entry?.pendingCount ?? 0),
          totalSales: sale?.totalSales ?? 0,
          totalEntries: entry?.totalEntries ?? 0,
          lastSaleAt: lastDates.length > 0
            ? new Date(Math.max(...lastDates.map((d) => new Date(d).getTime())))
            : null,
        }
      })
      .sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/customers]", err)
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 })
  }
}

// Create a standalone customer contact (no sale required)
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { name, phone, notes } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 })

    const trimmed = name.trim()

    // Check if a contact with this name already exists
    const existing = await db.customerContact.findUnique({ where: { name: trimmed } })
    if (existing) {
      return NextResponse.json({ error: "A customer with this name already exists" }, { status: 400 })
    }

    const contact = await db.customerContact.create({
      data: {
        name: trimmed,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (err) {
    console.error("[POST /api/customers]", err)
    return NextResponse.json({ error: "Failed to add customer" }, { status: 500 })
  }
}

// Rename a customer (updates customerName on all matching sales)
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { oldName, newName } = await req.json()
    if (!oldName?.trim()) return NextResponse.json({ error: "Old name is required" }, { status: 400 })
    if (!newName?.trim()) return NextResponse.json({ error: "New name cannot be empty" }, { status: 400 })

    const trimmedNew = newName.trim()
    if (trimmedNew === oldName.trim()) return NextResponse.json({ success: true, updated: 0 })

    // All renames happen in one transaction so a customer can never end up half-renamed
    const result = await db.$transaction(async (tx) => {
      const salesResult = await tx.sale.updateMany({
        where: { saleType: "customer", customerName: oldName.trim() },
        data: { customerName: trimmedNew },
      })

      // Move manual ledger entries to the new name as well
      await tx.customerLedgerEntry.updateMany({
        where: { customerName: oldName.trim() },
        data: { customerName: trimmedNew },
      })

      // Also rename the CustomerContact record if one exists.
      // If trimmedNew is already taken as a contact, delete the old one instead
      // (the sales merge means both names now resolve to trimmedNew).
      const newContactExists = await tx.customerContact.findUnique({ where: { name: trimmedNew } })
      if (newContactExists) {
        await tx.customerContact.deleteMany({ where: { name: oldName.trim() } })
      } else {
        await tx.customerContact.updateMany({ where: { name: oldName.trim() }, data: { name: trimmedNew } })
      }

      return salesResult
    })

    return NextResponse.json({ success: true, updated: result.count })
  } catch (err) {
    console.error("[PATCH /api/customers]", err)
    return NextResponse.json({ error: "Failed to rename customer" }, { status: 500 })
  }
}

// Delete a customer — clears customerName on all their sales (anonymizes, preserves financial data)
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name")
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    // Block deletion while manual ledger entries exist — they must be deleted first
    const entryCount = await db.customerLedgerEntry.count({ where: { customerName: name.trim() } })
    if (entryCount > 0) {
      return NextResponse.json(
        { error: "This customer has manual ledger amounts. Delete those amounts first, then remove the customer." },
        { status: 400 }
      )
    }

    const result = await db.$transaction(async (tx) => {
      const salesResult = await tx.sale.updateMany({
        where: { saleType: "customer", customerName: name.trim() },
        data: { customerName: null },
      })

      // Also remove the CustomerContact record if one exists
      await tx.customerContact.deleteMany({ where: { name: name.trim() } })

      return salesResult
    })

    return NextResponse.json({ success: true, updated: result.count })
  } catch (err) {
    console.error("[DELETE /api/customers]", err)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
