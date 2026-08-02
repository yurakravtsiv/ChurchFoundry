import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { LogoutButton } from "@/components/LogoutButton"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useStandalonePwa } from "@/hooks/useStandalonePwa"
import { navItems } from "@/lib/nav"
import { cn } from "@/lib/utils"

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
              "flex h-10 items-center rounded-md text-sm font-medium transition-[padding,gap,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <Icon className="size-4 shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate whitespace-nowrap"
              >
                {t(labelKey)}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarPanel({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <SidebarNav onNavigate={onNavigate} collapsed={collapsed} />
      <div className="mt-auto space-y-3">
        <SidebarVersion collapsed={collapsed} />
        <div className="border-t border-border pt-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LanguageSwitcher showLabel={false} onLanguageChange={onNavigate} />
              <ThemeToggle onToggle={onNavigate} />
            </div>
            <LogoutButton onPress={onNavigate} onSignedOut={onNavigate} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const { t } = useTranslation()
  const isStandalone = useStandalonePwa()
  const [hovered, setHovered] = useState(false)
  const collapsed = !hovered

  return (
    <>
      {/* Fixed rail width so main content does not jump when the panel expands on hover. */}
      <div className="relative hidden w-16 shrink-0 md:block">
        <motion.aside
          animate={{ width: collapsed ? 64 : 240 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={cn(
            "absolute inset-y-0 left-0 z-20 flex flex-col overflow-hidden border-r border-border bg-background py-4",
            collapsed ? "px-2" : "px-3 shadow-md",
          )}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setHovered(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setHovered(false)
            }
          }}
        >
          <SidebarPanel collapsed={collapsed} />
        </motion.aside>
      </div>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          open={open}
          className="flex h-full flex-col gap-0 bg-background p-0"
        >
          <div
            className={cn(
              "flex h-full min-h-0 flex-1 flex-col bg-background px-4 pb-3 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-4 pt-[max(1rem,env(safe-area-inset-top,0px))]",
              // Browser: extra bottom inset for chrome. PWA: sheet CSS pads the safe band.
              !isStandalone && "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
            )}
          >
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
