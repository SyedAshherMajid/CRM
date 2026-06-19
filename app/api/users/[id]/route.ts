import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { createClient } from "@/lib/supabase/server"

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

    // Delete from database first
    await db.user.delete({ where: { id } })

    // Delete from Supabase Auth
    const supabase = await createClient()
    await supabase.auth.admin.deleteUser(id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/users/[id]]", err)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
