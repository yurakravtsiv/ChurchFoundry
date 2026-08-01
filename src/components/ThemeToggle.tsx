import { Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"

type ThemeToggleProps = {
  onToggle?: () => void
}

export function ThemeToggle({ onToggle }: ThemeToggleProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
      onClick={() => {
        setTheme(isDark ? "light" : "dark")
        onToggle?.()
      }}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
