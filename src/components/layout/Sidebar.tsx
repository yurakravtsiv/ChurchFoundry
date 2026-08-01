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

function formatBuildTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${day}.${month} ${hours}:${minutes}`
}

function SidebarVersion({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <p
        className="truncate text-center text-[10px] leading-tight text-muted-foreground"
        title={`${__GIT_HASH__} · ${formatBuildTime(__BUILD_TIME__)}`}
      >
        {__GIT_HASH__}
      </p>
    )
  }

  return (
    <div className="space-y-0.5 text-xs leading-tight text-muted-foreground">
      <p>{__GIT_HASH__}</p>
      <p>{formatBuildTime(__BUILD_TIME__)}</p>
    </div>
  )
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
      <div className="mt-auto space-y-3">
        <SidebarVersion collapsed={collapsed} />
        <div className={cn("border-t border-border pt-3", collapsed && "pt-2")}>
          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher showLabel={false} />
            <ThemeToggle />
          </div>
          {onToggleCollapsed ? (
            <div className="hidden md:block">
              <Button
                type="button"
                variant="ghost"
                size={collapsed ? "icon" : "sm"}
                className={cn("w-full", !collapsed && "justify-start gap-2")}
                onClick={onToggleCollapsed}
                aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
                title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
              >
                {collapsed ? (
                  <ChevronsRight className="size-4" />
                ) : (
                  <ChevronsLeft className="size-4" />
                )}
                {!collapsed ? <span>{t("nav.collapseSidebar")}</span> : null}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
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
          "hidden shrink-0 border-r border-border bg-background transition-[width] duration-200 md:flex md:flex-col md:py-4",
          collapsed ? "w-16 px-2" : "w-60 px-3",
        )}
      >
        <SidebarPanel collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="flex w-full max-w-none flex-col bg-background p-0 sm:max-w-none"
        >
          <div className="flex h-full flex-col bg-background px-4 pb-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <SheetHeader className="text-left">
              <SheetTitle>{t("app.name")}</SheetTitle>
              <SheetDescription className="sr-only">{t("nav.menuDescription")}</SheetDescription>
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
