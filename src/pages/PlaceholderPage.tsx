import { useTranslation } from "react-i18next"

type PlaceholderPageProps = {
  titleKey: string
}

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <main className="px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("nav.comingSoon")}</p>
    </main>
  )
}
