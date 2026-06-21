import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(users)
  } catch (err) {
    console.error("[GET /api/users]", err)
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, email, password } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Create auth user via Supabase Admin API
    const supabase = createAdminClient()
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authUser.user?.id) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Create user record in database
    const newUser = await db.user.create({
      data: {
        id: authUser.user.id,
        name: name.trim(),
        email: email.trim(),
      },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (err) {
    console.error("[POST /api/users]", err)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
