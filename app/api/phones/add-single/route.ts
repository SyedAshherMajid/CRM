import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { Brand, Storage, Condition } from "@prisma/client"

// Map UI values to Prisma enum values
function mapBrand(brand: string): Brand {
  if (brand === "Google Pixel") return "GooglePixel" as Brand
  return brand as Brand // iPhone stays as is
}

function mapStorage(storage: string): Storage {
  const storageMap: Record<string, Storage> = {
    "64GB": "GB64",
    "128GB": "GB128",
    "256GB": "GB256",
    "512GB": "GB512",
    "1TB": "TB1",
  }
  return storageMap[storage] || (storage as Storage)
}

function mapCondition(condition: string): Condition {
  const conditionMap: Record<string, Condition> = {
    "Like New": "LikeNew",
  }
  return conditionMap[condition] || (condition as Condition)
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { brand, model, storage, color, condition, batteryHealth, costPrice, imei, notes, sellerCnic, sellerName } = body

    // Validation
    if (!brand || !model || !storage || !color || !condition || !costPrice || !imei) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (Number(costPrice) <= 0) {
      return NextResponse.json({ error: "Cost price must be greater than 0" }, { status: 400 })
    }

    // Allow partial IMEIs (at least 4 digits)
    const cleanedIMEI = imei.replace(/\D/g, "")
    if (cleanedIMEI.length < 4) {
      return NextResponse.json({ error: "IMEI must have at least 4 digits" }, { status: 400 })
    }

    // Check if IMEI already exists
    const existingPhone = await db.phone.findUnique({ where: { imei: cleanedIMEI } })
    if (existingPhone) {
      return NextResponse.json({ error: "IMEI already exists in system" }, { status: 400 })
    }

    // Create a temporary lot for single phones (or create phone without lot)
    // For now, we'll create a special "Direct Purchase" lot or add phone without lot
    // Let's check schema to see if phone.lotId is optional
    // Based on CLAUDE.md, every phone belongs to a lot. So we need to create a special lot.

    // Create or get a special "Direct Purchases" lot
    let directPurchaseLot = await db.purchaseLot.findFirst({
      where: {
        name: "Direct Purchases",
        notes: { contains: "Auto-created for direct phone purchases" },
      },
    })

    if (!directPurchaseLot) {
      directPurchaseLot = await db.purchaseLot.create({
        data: {
          name: "Direct Purchases",
          totalAmount: 0,
          amountPaid: 0,
          notes: "Auto-created for direct phone purchases (not from a supplier lot)",
          createdBy: user.id,
        },
      })
    }

    // Create the phone
    const phone = await db.phone.create({
      data: {
        lotId: directPurchaseLot.id,
        brand: mapBrand(brand),
        model,
        storage: mapStorage(storage),
        color,
        imei: cleanedIMEI,
        condition: mapCondition(condition),
        batteryHealth: batteryHealth || null,
        costPrice: Number(costPrice),
        sellerCnic: sellerCnic?.trim() || null,
        sellerName: sellerName?.trim() || null,
        status: "available",
        notes: notes || null,
        addedBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      phone: {
        id: phone.id,
        model: phone.model,
        imei: phone.imei,
      },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error("[POST /api/phones/add-single] Error:", errorMessage, err)
    return NextResponse.json({ error: `Failed to add phone: ${errorMessage}` }, { status: 500 })
  }
}
