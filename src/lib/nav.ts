import { Boxes, CalendarDays, HandHeart, Home, type LucideIcon, Users } from "lucide-react"

export type NavItem = {
  to: string
  labelKey: "nav.home" | "nav.people" | "nav.services" | "nav.calendar" | "nav.inventory"
  icon: LucideIcon
  end?: boolean
}

export const navItems: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home, end: true },
  { to: "/people", labelKey: "nav.people", icon: Users },
  { to: "/services", labelKey: "nav.services", icon: HandHeart },
  { to: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
]

export const homeTiles = navItems.filter((item) => item.to !== "/")
