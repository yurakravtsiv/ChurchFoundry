import { RefreshCw } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { LogoutButton } from "@/components/LogoutButton"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { useStandalonePwa } from "@/hooks/useStandalonePwa"
import { navItems } from "@/lib/nav"
import { reloadApp } from "@/lib/reloadApp"
import { cn } from "@/lib/utils"

const REFRESH_SPIN_MS = 1000

type HeaderProps = {
  onOpenSidebar: () => void
}

function useCurrentPageLabelKey() {
  const { pathname } = useLocation()

  const match = navItems.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )

  return match?.labelKey ?? "nav.dashboard"
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { t } = useTranslation()
  const pageLabelKey = useCurrentPageLabelKey()
  const isStandalone = useStandalonePwa()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    if (refreshing) {
      return
    }
    setRefreshing(true)
    window.setTimeout(() => {
      void reloadApp()
    }, REFRESH_SPIN_MS)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      {/* Safe-area padding on the inner wrapper so header bg continues under the notch */}
      <div className="pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="relative flex h-14 items-center gap-3 px-4 md:px-6">
          {/* Mobile: logo opens the drawer. Desktop: logo links home. */}
          <button
            type="button"
            className="shrink-0 rounded-md md:hidden"
            onClick={onOpenSidebar}
            aria-label={t("nav.openMenu")}
          >
            <img src="/favicon.svg" alt="" width={28} height={28} className="size-7 rounded-md" />
          </button>

          <Link
            to="/"
            className="hidden min-w-0 items-center gap-2 font-semibold tracking-tight md:flex"
          >
            <img
              src="/favicon.svg"
              alt=""
              width={28}
              height={28}
              className="size-7 shrink-0 rounded-md"
            />
            <span className="truncate text-base sm:text-lg">{t("app.name")}</span>
          </Link>

          <p className="pointer-events-none absolute inset-x-0 mx-auto max-w-[55%] truncate text-center text-lg font-semibold tracking-tight md:hidden">
            {t(pageLabelKey)}
          </p>

          {isStandalone ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-9 md:hidden"
              disabled={refreshing}
              onClick={handleRefresh}
              aria-label={refreshing ? t("refresh.refreshing") : t("refresh.action")}
            >
              <RefreshCw
                className={cn("size-4", refreshing && "animate-spin [animation-duration:0.8s]")}
                aria-hidden
              />
            </Button>
          ) : null}

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <LanguageSwitcher showLabel={false} />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  )
}
