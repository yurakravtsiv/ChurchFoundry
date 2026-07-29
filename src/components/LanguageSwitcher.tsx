import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import type { SupportedLanguage } from "@/types"

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = i18n.language.startsWith("en") ? "en" : "uk"

  const setLanguage = (lng: SupportedLanguage) => {
    void i18n.changeLanguage(lng)
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
      <span className="text-sm text-muted-foreground">{t("home.language")}</span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={current === "uk" ? "default" : "outline"}
          onClick={() => setLanguage("uk")}
          aria-pressed={current === "uk"}
        >
          UK
        </Button>
        <Button
          type="button"
          size="sm"
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
