"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, PlusCircle, ShoppingBag, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { BarChart3, Store, Users, Settings, Truck } from "lucide-react"

const mainLinks = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/sales", label: "Sale", icon: PlusCircle, highlight: true },
  { href: "/lots", label: "Lots", icon: ShoppingBag },
]

const moreLinks = [
  { href: "/shops", label: "Shop Buyers", icon: Store },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {mainLinks.map(({ href, label, icon: Icon, highlight }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs font-medium transition-colors",
                highlight
                  ? "text-white"
                  : active
                  ? "text-black"
                  : "text-gray-500"
              )}
            >
              {highlight ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-black rounded-full p-3 -mt-5 shadow-lg">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-600">{label}</span>
                </div>
              ) : (
                <>
                  <Icon className={cn("w-5 h-5", active ? "text-black" : "text-gray-400")} />
                  <span>{label}</span>
                </>
              )}
            </Link>
          )
        })}

        {/* More sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs font-medium text-gray-500">
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <div className="pt-2 pb-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
              <div className="grid grid-cols-2 gap-3">
                {moreLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-800">{label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
