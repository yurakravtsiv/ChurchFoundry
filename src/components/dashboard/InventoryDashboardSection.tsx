import { Boxes } from "lucide-react"
import { motion } from "motion/react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { DashboardWidget } from "@/components/dashboard/DashboardWidget"
import { Card } from "@/components/ui/card"
import { QueryErrorState } from "@/components/ui/query-error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useInventoryItemsQuery } from "@/hooks/queries/useInventoryQueries"

function DashboardWidgetSkeleton() {
  return (
    <Card className="px-5 py-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-16 sm:h-14" />
        <Skeleton className="h-4 w-40" />
      </div>
    </Card>
  )
}

export function InventoryDashboardSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: items = [], isLoading, isError, refetch } = useInventoryItemsQuery()

  const { needsRepairCount, borrowedCount } = useMemo(() => {
    const activeItems = items.filter((item) => !item.archived && !item.removed)
    return {
      needsRepairCount: activeItems
        .filter((item) => item.condition === "needs_repair")
        .reduce((sum, item) => sum + item.quantity, 0),
      borrowedCount: activeItems
        .filter((item) => item.availability === "borrowed")
        .reduce((sum, item) => sum + item.quantity, 0),
    }
  }, [items])

  return (
    <section className="space-y-3" aria-labelledby="dashboard-inventory-heading">
      <div className="flex items-center gap-2">
        <Boxes className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <h2 id="dashboard-inventory-heading" className="text-lg font-semibold tracking-tight">
          {t("nav.inventory")}
        </h2>
      </div>

      {isError ? (
        <QueryErrorState
          onRetry={() => void refetch()}
          className="flex flex-col items-start gap-3 py-4"
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DashboardWidgetSkeleton />
          <DashboardWidgetSkeleton />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <DashboardWidget
              title={t("inventory.condition.needsRepair")}
              count={needsRepairCount}
              colorVariant="info"
              onClick={() => navigate("/inventory?condition=needs_repair")}
            />
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <DashboardWidget
              title={t("inventory.availability.borrowed")}
              count={borrowedCount}
              colorVariant="warning"
              onClick={() => navigate("/inventory?availability=borrowed")}
            />
          </motion.div>
        </motion.div>
      )}
    </section>
  )
}
