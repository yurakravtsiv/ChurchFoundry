import { Boxes } from "lucide-react"
import { motion } from "motion/react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { DashboardWidget } from "@/components/dashboard/DashboardWidget"
import { getInventoryItems } from "@/lib/inventoryStorage"

export function InventoryDashboardSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { needsRepairCount, borrowedCount } = useMemo(() => {
    const activeItems = getInventoryItems().filter((item) => !item.archived && !item.removed)
    return {
      needsRepairCount: activeItems.filter((item) => item.condition === "needs_repair").length,
      borrowedCount: activeItems.filter((item) => item.availability === "borrowed").length,
    }
  }, [])

  return (
    <section className="space-y-3" aria-labelledby="dashboard-inventory-heading">
      <div className="flex items-center gap-2">
        <Boxes className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <h2 id="dashboard-inventory-heading" className="text-lg font-semibold tracking-tight">
          {t("nav.inventory")}
        </h2>
      </div>

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
    </section>
  )
}
