import type { DashboardWidgetColorVariant } from "@/components/dashboard/DashboardWidget"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SplitDashboardSide = {
  title: string
  count: number
}

type SplitDashboardWidgetProps = {
  left: SplitDashboardSide
  right: SplitDashboardSide
  colorVariant: DashboardWidgetColorVariant
  onClick: () => void
}

const variantStyles: Record<
  DashboardWidgetColorVariant,
  { card: string; divider: string; count: string; title: string }
> = {
  warning: {
    card: "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30",
    divider: "divide-amber-300/80 dark:divide-amber-900/60",
    count: "text-amber-900 dark:text-amber-200",
    title: "text-amber-900/80 dark:text-amber-200/80",
  },
  info: {
    card: "border-red-200/80 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/25",
    divider: "divide-red-200/80 dark:divide-red-900/40",
    count: "text-red-800 dark:text-red-400",
    title: "text-red-800/80 dark:text-red-400/80",
  },
  default: {
    card: "border-border bg-card",
    divider: "divide-border",
    count: "text-foreground",
    title: "text-muted-foreground",
  },
}

function SplitSide({
  side,
  styles,
  highlighted,
}: {
  side: SplitDashboardSide
  styles: (typeof variantStyles)[DashboardWidgetColorVariant]
  highlighted?: boolean
}) {
  return (
    <div
      className={cn(
        "h-full min-w-0 px-5 py-6",
        highlighted && "bg-orange-200/80 dark:bg-orange-950/55",
      )}
    >
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl",
            highlighted ? "text-orange-800 dark:text-orange-200" : styles.count,
          )}
        >
          {side.count}
        </p>
        <p
          className={cn(
            "text-sm font-medium sm:text-base",
            highlighted ? "text-orange-950/80 dark:text-orange-100/80" : styles.title,
          )}
        >
          {side.title}
        </p>
      </div>
    </div>
  )
}

export function SplitDashboardWidget({
  left,
  right,
  colorVariant,
  onClick,
}: SplitDashboardWidgetProps) {
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
        "h-full cursor-pointer overflow-hidden p-0 shadow-sm transition",
        "md:hover:scale-[1.02] md:hover:shadow-md",
        "[@media(hover:none)]:hover:scale-100 [@media(hover:none)]:hover:shadow-sm",
        styles.card,
      )}
    >
      <div className={cn("grid h-full grid-cols-2 divide-x", styles.divider)}>
        <SplitSide side={left} styles={styles} />
        <SplitSide side={right} styles={styles} highlighted />
      </div>
    </Card>
  )
}
