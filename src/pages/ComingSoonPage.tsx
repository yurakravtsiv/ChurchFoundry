import { CalendarClock } from "lucide-react"
import { useTranslation } from "react-i18next"

export function ComingSoonPage() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] w-full flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <CalendarClock
        className="mb-6 size-24 animate-breathe text-muted-foreground sm:size-28 md:size-32"
        strokeWidth={1.25}
        aria-hidden
      />
      <p className="text-2xl font-medium tracking-tight text-muted-foreground sm:text-3xl">
        {t("nav.comingSoonMessage")}
      </p>
    </main>
  )
}
