import { Boxes, LayoutDashboard, type LucideIcon } from "lucide-react"

export type NavItem = {
  to: string
  labelKey: "nav.dashboard" | "nav.inventory"
  icon: LucideIcon
  end?: boolean
}

export const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
]
