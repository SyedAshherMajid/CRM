import { redirect } from "next/navigation"

// Root / redirects to dashboard (handled by middleware + dashboard layout)
export default function RootPage() {
  redirect("/")
}
