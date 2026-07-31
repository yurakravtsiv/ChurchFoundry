import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { homeTiles } from "@/lib/nav"
import { cn } from "@/lib/utils"

const ACTIVE_PATH = "/inventory"

export function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {homeTiles.map(({ to, labelKey, icon: Icon }) => {
          const isActive = to === ACTIVE_PATH

          if (isActive) {
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex items-center gap-4 overflow-hidden rounded-[12px] border border-border bg-card px-5 py-6 text-card-foreground shadow-sm transition",
                  "md:hover:scale-[1.02] md:hover:border-foreground/20 md:hover:bg-accent md:hover:shadow-md",
                  "[@media(hover:none)]:hover:scale-100 [@media(hover:none)]:hover:bg-card [@media(hover:none)]:hover:shadow-sm",
                )}
              >
                <Icon className="size-7 shrink-0 sm:size-8" aria-hidden />
                <span className="text-base font-medium sm:text-lg">{t(labelKey)}</span>
              </Link>
            )
          }

          return (
            <div
              key={to}
              aria-disabled="true"
              className="relative flex cursor-not-allowed pointer-events-none items-center gap-4 overflow-hidden rounded-[12px] border border-border/60 bg-muted/50 px-5 py-6 text-muted-foreground opacity-60"
            >
              <div className="absolute top-[22px] -right-[42px] w-[160px] rotate-45 bg-gray-500 py-1 text-center text-[11px] font-medium tracking-wide whitespace-nowrap text-white uppercase dark:bg-gray-600">
                {t("nav.comingSoon")}
              </div>
              <Icon className="size-7 shrink-0 sm:size-8" aria-hidden />
              <span className="text-base font-medium sm:text-lg">{t(labelKey)}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}
