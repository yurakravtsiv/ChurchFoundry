import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type QueryErrorStateProps = {
  onRetry: () => void
  className?: string
}

export function QueryErrorState({ onRetry, className }: QueryErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div
      className={
        className ?? "flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center"
      }
    >
      <p className="text-lg text-muted-foreground">{t("common.loadError")}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  )
}
