import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useAppUpdate } from "@/hooks/useAppUpdate"

export function UpdateBanner() {
  const { t } = useTranslation()
  const { needRefresh, updateApp, dismissUpdate } = useAppUpdate()

  return (
    <AnimatePresence>
      {needRefresh ? (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.25 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-lg">
            <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-foreground">
              <motion.span
                className="size-2 shrink-0 rounded-full bg-primary"
                aria-hidden
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="min-w-0 truncate">{t("update.available")}</span>
            </p>
            <Button asChild size="sm">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={() => void updateApp()}
              >
                {t("update.action")}
              </motion.button>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={dismissUpdate}
              aria-label={t("update.dismiss")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
