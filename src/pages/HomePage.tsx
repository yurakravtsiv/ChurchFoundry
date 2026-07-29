import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { homeTiles } from "@/lib/nav"
import { cn } from "@/lib/utils"

const ACTIVE_PATH = "/inventory"

export function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight md:text-3xl">{t("nav.home")}</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {homeTiles.map(({ to, labelKey, icon: Icon }) => {
          const isActive = to === ACTIVE_PATH
          const content = (
            <>
              {!isActive ? (
                <span className="absolute right-3 top-4 z-10 rotate-12 rounded-sm bg-foreground px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-background shadow-sm sm:top-5 sm:px-4">
                  {t("nav.comingSoon")}
                </span>
              ) : null}
              <Icon className="size-7 shrink-0 sm:size-8" aria-hidden />
              <span className="text-base font-medium sm:text-lg">{t(labelKey)}</span>
            </>
          )

          if (isActive) {
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-6 text-card-foreground shadow-sm transition",
                  "md:hover:scale-[1.02] md:hover:border-foreground/20 md:hover:bg-accent md:hover:shadow-md",
                  "[@media(hover:none)]:hover:scale-100 [@media(hover:none)]:hover:bg-card [@media(hover:none)]:hover:shadow-sm",
                )}
              >
                {content}
              </Link>
            )
          }

          return (
            <div
              key={to}
              aria-disabled="true"
              className="relative flex cursor-not-allowed pointer-events-none items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-muted/50 px-5 py-6 text-muted-foreground opacity-60"
            >
              {content}
            </div>
          )
        })}
      </div>
    </main>
  )
}
