import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { createAdminClient } from "@/lib/supabase/admin"

const HIDDEN_OWNER_EMAIL = "ashher.work@gmail.com"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    // Cannot delete yourself
    if (id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Cannot delete hidden owner account
    const target = await db.user.findUnique({ where: { id }, select: { email: true } })
    if (target?.email === HIDDEN_OWNER_EMAIL) {
      return NextResponse.json({ error: "Cannot delete this account" }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/users/[id]]", err)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
