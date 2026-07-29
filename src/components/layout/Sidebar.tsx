import { Boxes, CalendarDays, Church, Home, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", labelKey: "nav.home", icon: Home, end: true },
  { to: "/members", labelKey: "nav.members", icon: Users, end: false },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes, end: false },
  { to: "/rooms", labelKey: "nav.rooms", icon: CalendarDays, end: false },
  { to: "/ministries", labelKey: "nav.ministries", icon: Church, end: false },
] as const

type SidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()

  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label={t("nav.main")}>
      {navItems.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <Icon className="size-4 shrink-0" />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarControls() {
  return (
    <div className="flex items-center gap-3 border-t border-border pt-4 md:hidden">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  )
}

function SidebarPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="hidden md:block">
        <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("nav.main")}
        </p>
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <SidebarControls />
    </div>
  )
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:flex md:flex-col md:px-3 md:py-4">
        <SidebarPanel />
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="flex w-[min(100%,20rem)] flex-col p-4">
          <SheetHeader className="text-left">
            <SheetTitle>{t("app.name")}</SheetTitle>
            <SheetDescription>{t("nav.menuDescription")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <SidebarPanel onNavigate={() => onOpenChange(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
