import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return null

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
}
