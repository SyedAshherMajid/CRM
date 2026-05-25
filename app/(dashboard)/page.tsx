import { LayoutDashboard } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <LayoutDashboard className="w-5 h-5" />
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </div>
      <p className="text-gray-500">Dashboard stats coming soon...</p>
    </div>
  )
}
