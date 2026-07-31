import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { cn } from "@/lib/utils"

export function UpdateBanner() {
  const { t } = useTranslation()
  const { needRefresh, updateApp } = useAppUpdate()

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] transition-all duration-300 ease-out",
        needRefresh ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
      aria-live="polite"
      aria-hidden={!needRefresh}
    >
      {needRefresh ? (
        <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{t("update.available")}</p>
          <Button type="button" size="sm" onClick={updateApp}>
            {t("update.action")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
