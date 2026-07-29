import { useTranslation } from "react-i18next"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-8 sm:px-6">
      <Card>
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {t("app.name")}
          </CardTitle>
          <CardDescription className="text-base">{t("app.tagline")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground sm:text-base">
            {t("app.description")}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button type="button" className="w-full sm:w-auto">
            {t("home.getStarted")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
