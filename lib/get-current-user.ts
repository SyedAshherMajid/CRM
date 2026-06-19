import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser) return null

    // Sync auth user into our users table on first use
    const user = await db.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.email!.split("@")[0],
      },
      update: { email: authUser.email! },
    })

    return user
  } catch (err) {
    console.error("Error getting current user:", err)
    return null
  }
}
