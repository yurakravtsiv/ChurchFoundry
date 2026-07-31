import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { navItems } from "@/lib/nav"
import { cn } from "@/lib/utils"

const SIDEBAR_COLLAPSED_KEY = "churchfoundry-sidebar-collapsed"

type SidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarNav({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { t } = useTranslation()

  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label={t("nav.main")}>
      {navItems.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? t(labelKey) : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-md text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <Icon className="size-4 shrink-0" />
          <span className={cn(collapsed && "sr-only")}>{t(labelKey)}</span>
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

function SidebarPanel({
  onNavigate,
  collapsed,
  onToggleCollapsed,
}: {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col gap-6">
      <SidebarNav onNavigate={onNavigate} collapsed={collapsed} />
      <SidebarControls />
      {onToggleCollapsed ? (
        <div
          className={cn("mt-auto hidden border-t border-border pt-3 md:block", collapsed && "pt-2")}
        >
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("w-full", !collapsed && "justify-start gap-2")}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed ? <span>{t("nav.collapseSidebar")}</span> : null}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // Ignore private-mode / quota errors.
    }
  }, [collapsed])

  const toggleCollapsed = () => {
    setCollapsed((value) => !value)
  }

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-background transition-[width] duration-200 md:flex md:flex-col md:py-4 md:pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          collapsed ? "w-16 px-2" : "w-60 px-3",
        )}
      >
        <SidebarPanel collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="flex w-[min(100%,20rem)] flex-col bg-background p-0">
          <div className="flex h-full flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <SheetHeader className="text-left">
              <SheetTitle>{t("app.name")}</SheetTitle>
              <SheetDescription>{t("nav.menuDescription")}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              <SidebarPanel onNavigate={() => onOpenChange(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
