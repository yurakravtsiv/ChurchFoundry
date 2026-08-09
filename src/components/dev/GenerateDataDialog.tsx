import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { inventoryQueryKeys } from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import { generateSeedData, SEED_ITEM_COUNT } from "@/lib/inventoryDataGenerator"

type GenerateDataDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GenerateDataDialog({ open, onOpenChange }: GenerateDataDialogProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isGenerating, setIsGenerating] = useState(false)
  const userEmail = user?.email ?? ""

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      generateSeedData(userEmail)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.categories }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.subcategories }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.locations }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
      ])
      onOpenChange(false)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isGenerating) {
          return
        }
        onOpenChange(nextOpen)
      }}
    >
      <MotionDialogContent open={open} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("generateData.title")}</DialogTitle>
          <DialogDescription>
            {t("generateData.description", { count: SEED_ITEM_COUNT })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isGenerating}
            onClick={() => onOpenChange(false)}
          >
            {t("generateData.cancel")}
          </Button>
          <Button type="button" disabled={isGenerating} onClick={() => void handleGenerate()}>
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("generateData.generating")}
              </>
            ) : (
              t("generateData.confirm")
            )}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
