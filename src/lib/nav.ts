import {
  Boxes,
  CalendarDays,
  HandHeart,
  LayoutDashboard,
  type LucideIcon,
  Users,
} from "lucide-react"

export type NavItem = {
  to: string
  labelKey: "nav.dashboard" | "nav.people" | "nav.services" | "nav.calendar" | "nav.inventory"
  icon: LucideIcon
  end?: boolean
}

export const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/people", labelKey: "nav.people", icon: Users },
  { to: "/services", labelKey: "nav.services", icon: HandHeart },
  { to: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
]
