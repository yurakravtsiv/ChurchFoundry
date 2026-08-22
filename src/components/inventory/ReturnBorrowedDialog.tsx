import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { type Resolver, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type ReturnBorrowedFormValues = {
  quantity: number
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
  const maxQuantity = item?.quantity ?? 1

  const schema = useMemo(
    () =>
      z.object({
        quantity: z.preprocess(
          (value) => {
            if (value === "" || value === null || value === undefined) {
              return undefined
            }
            const parsed = typeof value === "number" ? value : Number(value)
            return Number.isFinite(parsed) ? parsed : undefined
          },
          z
            .number({ error: t("inventory.returnBorrowed.validation.quantityInvalid") })
            .int(t("inventory.returnBorrowed.validation.quantityInvalid"))
            .min(1, t("inventory.returnBorrowed.validation.quantityMin"))
            .max(
              maxQuantity,
              t("inventory.returnBorrowed.validation.quantityMax", { quantity: maxQuantity }),
            ),
        ),
      }),
    [maxQuantity, t],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReturnBorrowedFormValues>({
    resolver: zodResolver(schema) as Resolver<ReturnBorrowedFormValues>,
    defaultValues: {
      quantity: 1,
    },
  })

  useEffect(() => {
    if (!open || !item) {
      return
    }
    reset({
      quantity: 1,
    })
  }, [item, open, reset])

  const submit = handleSubmit((values) => {
    if (!item) {
      return
    }
    returnBorrowedMutation.mutate(
      { borrowedItemId: item.id, quantity: values.quantity, userEmail: user?.email ?? "" },
      {
        onSuccess: () => {
          onOpenChange(false)
          onConfirm()
        },
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MotionDialogContent open={open} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inventory.returnBorrowed.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory.returnBorrowed.description", {
              quantity: item?.quantity ?? 0,
            })}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}>
          <div className="space-y-2">
            <Label htmlFor="return-borrowed-quantity">
              {t("inventory.returnBorrowed.quantity")} *
            </Label>
            <Input
              id="return-borrowed-quantity"
              type="number"
              min={1}
              max={maxQuantity}
              step={1}
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity ? (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || returnBorrowedMutation.isPending}
            >
              {t("inventory.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!item || isSubmitting || returnBorrowedMutation.isPending}
            >
              {t("inventory.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </MotionDialogContent>
    </Dialog>
  )
}
