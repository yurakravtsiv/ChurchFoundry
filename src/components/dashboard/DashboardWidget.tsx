import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type DashboardWidgetColorVariant = "warning" | "info" | "default"

type DashboardWidgetProps = {
  title: string
  count: number
  colorVariant: DashboardWidgetColorVariant
  onClick: () => void
}

const variantStyles: Record<
  DashboardWidgetColorVariant,
  { card: string; count: string; title: string }
> = {
  warning: {
    card: "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30",
    count: "text-amber-900 dark:text-amber-200",
    title: "text-amber-900/80 dark:text-amber-200/80",
  },
  info: {
    card: "border-red-200/80 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/25",
    count: "text-red-800 dark:text-red-400",
    title: "text-red-800/80 dark:text-red-400/80",
  },
  default: {
    card: "border-border bg-card",
    count: "text-foreground",
    title: "text-muted-foreground",
  },
}

export function DashboardWidget({ title, count, colorVariant, onClick }: DashboardWidgetProps) {
  const styles = variantStyles[colorVariant]

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "h-full cursor-pointer px-5 py-6 shadow-sm transition",
        "md:hover:scale-[1.02] md:hover:shadow-md",
        "[@media(hover:none)]:hover:scale-100 [@media(hover:none)]:hover:shadow-sm",
        styles.card,
      )}
    >
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl",
            styles.count,
          )}
        >
          {count}
        </p>
        <p className={cn("text-sm font-medium sm:text-base", styles.title)}>{title}</p>
      </div>
    </Card>
  )
}
