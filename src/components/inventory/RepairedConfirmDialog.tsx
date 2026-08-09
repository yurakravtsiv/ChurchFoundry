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
import { useMarkAsRepairedMutation } from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import type { InventoryItem } from "@/types/inventory"

type RepairedConfirmDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function RepairedConfirmDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: RepairedConfirmDialogProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const markAsRepairedMutation = useMarkAsRepairedMutation()

  const confirm = () => {
    if (!item) {
      return
    }
    markAsRepairedMutation.mutate(
      { repairItemId: item.id, userEmail: user?.email ?? "" },
      {
        onSuccess: () => {
          onOpenChange(false)
          onConfirm()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MotionDialogContent open={open} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inventory.repaired.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory.repaired.description", {
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
            disabled={markAsRepairedMutation.isPending}
          >
            {t("inventory.actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={!item || markAsRepairedMutation.isPending}
          >
            {t("inventory.actions.confirm")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
