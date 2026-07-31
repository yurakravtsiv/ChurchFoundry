import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { navItems } from "@/lib/nav"

type HeaderProps = {
  onOpenSidebar: () => void
}

function useCurrentPageLabelKey() {
  const { pathname } = useLocation()

  const match = navItems.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )

  return match?.labelKey ?? "nav.home"
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { t } = useTranslation()
  const pageLabelKey = useCurrentPageLabelKey()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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

          <p className="pointer-events-none absolute inset-x-0 mx-auto max-w-[55%] truncate text-center text-sm font-semibold tracking-tight md:hidden">
            {t(pageLabelKey)}
          </p>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <LanguageSwitcher showLabel={false} />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
