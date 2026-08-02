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
import { useReturnToStockMutation } from "@/hooks/queries/useInventoryQueries"
import type { InventoryItem } from "@/types/inventory"

type ReturnToStockDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ReturnToStockDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: ReturnToStockDialogProps) {
  const { t } = useTranslation()
  const returnToStockMutation = useReturnToStockMutation()

  const confirm = () => {
    if (!item) {
      return
    }
    returnToStockMutation.mutate(item.id, {
      onSuccess: () => {
        onOpenChange(false)
        onConfirm()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MotionDialogContent open={open} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inventory.returnToStock.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory.returnToStock.description", {
              quantity: item?.quantity ?? 0,
              name: item?.name ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={returnToStockMutation.isPending}
          >
            {t("inventory.actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={!item || returnToStockMutation.isPending}
          >
            {t("inventory.actions.returnToStock")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
