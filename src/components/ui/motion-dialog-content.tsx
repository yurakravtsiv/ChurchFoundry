import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import * as React from "react"
import { useTranslation } from "react-i18next"

import { DialogPortal } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type MotionDialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  open: boolean
}

const MotionDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  MotionDialogContentProps
>(({ className, children, open, ...props }, ref) => {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {open ? (
        <DialogPortal forceMount key="motion-dialog">
          <DialogPrimitive.Overlay forceMount asChild>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content forceMount asChild ref={ref} {...props}>
            {/*
              Full-screen flex shell centers the panel without CSS/motion translate
              on the scrollable surface (avoids transform + overflow bugs).
            */}
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                className={cn(
                  "pointer-events-auto relative flex max-h-[min(90vh,100dvh)] w-full max-w-lg flex-col overflow-hidden border bg-background p-6 shadow-lg sm:rounded-lg",
                  className,
                )}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", duration: 0.25, bounce: 0.15 }}
              >
                {children}
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">{t("a11y.close")}</span>
                </DialogPrimitive.Close>
              </motion.div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      ) : null}
    </AnimatePresence>
  )
})
MotionDialogContent.displayName = "MotionDialogContent"

export { MotionDialogContent }
