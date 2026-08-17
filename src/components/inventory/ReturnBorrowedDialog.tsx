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
import { useReturnBorrowedMutation } from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import type { InventoryItem } from "@/types/inventory"

type ReturnBorrowedDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ReturnBorrowedDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
}: ReturnBorrowedDialogProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const returnBorrowedMutation = useReturnBorrowedMutation()

  const confirm = () => {
    if (!item) {
      return
    }
    returnBorrowedMutation.mutate(
      { borrowedItemId: item.id, userEmail: user?.email ?? "" },
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
          <DialogTitle>{t("inventory.returnBorrowed.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory.returnBorrowed.description", {
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
            disabled={returnBorrowedMutation.isPending}
          >
            {t("inventory.actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={!item || returnBorrowedMutation.isPending}
          >
            {t("inventory.actions.confirm")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
