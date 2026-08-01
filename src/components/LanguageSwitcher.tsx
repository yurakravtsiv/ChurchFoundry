import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SupportedLanguage } from "@/types"

type LanguageSwitcherProps = {
  className?: string
  showLabel?: boolean
  onLanguageChange?: () => void
}

export function LanguageSwitcher({
  className,
  showLabel = true,
  onLanguageChange,
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation()
  const current = i18n.language.startsWith("en") ? "en" : "uk"

  const setLanguage = (lng: SupportedLanguage) => {
    void i18n.changeLanguage(lng)
    onLanguageChange?.()
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel ? (
        <span className="text-sm text-muted-foreground">{t("home.language")}</span>
      ) : null}
      <div className="flex gap-1">
        <Button
          type="button"
          className="h-9 px-3"
          variant={current === "uk" ? "default" : "outline"}
          onClick={() => setLanguage("uk")}
          aria-pressed={current === "uk"}
        >
          UK
        </Button>
        <Button
          type="button"
          className="h-9 px-3"
          variant={current === "en" ? "default" : "outline"}
          onClick={() => setLanguage("en")}
          aria-pressed={current === "en"}
        >
          EN
        </Button>
      </div>
    </div>
  )
}
