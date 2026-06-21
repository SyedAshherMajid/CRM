import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"

// cache() deduplicates calls within the same request lifecycle.
// If multiple API route functions call getCurrentUser() in the same request,
// Supabase auth + DB only get hit once — not once per call.
export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser) return null

    // Fast path: user already exists in DB (the common case — 99% of requests)
    // findUnique is a simple read, much cheaper than upsert (read + conditional write)
    const existing = await db.user.findUnique({
      where: { id: authUser.id },
    })

    if (existing) return existing

    // Slow path: first-ever login for this user — create the record
    // This only runs once per user in their lifetime, never again after that
    const newUser = await db.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.email!.split("@")[0],
      },
      update: { email: authUser.email! },
    })

    return newUser
  } catch (err) {
    console.error("Error getting current user:", err)
    return null
  }
})
