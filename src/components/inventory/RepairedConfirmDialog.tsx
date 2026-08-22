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
import { useMarkAsRepairedMutation } from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import type { InventoryItem } from "@/types/inventory"

type RepairedConfirmDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

type RepairedFormValues = {
  quantity: number
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
            .number({ error: t("inventory.repaired.validation.quantityInvalid") })
            .int(t("inventory.repaired.validation.quantityInvalid"))
            .min(1, t("inventory.repaired.validation.quantityMin"))
            .max(
              maxQuantity,
              t("inventory.repaired.validation.quantityMax", { quantity: maxQuantity }),
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
  } = useForm<RepairedFormValues>({
    resolver: zodResolver(schema) as Resolver<RepairedFormValues>,
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
    markAsRepairedMutation.mutate(
      { repairItemId: item.id, quantity: values.quantity, userEmail: user?.email ?? "" },
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
          <DialogTitle>{t("inventory.repaired.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory.repaired.description", {
              quantity: item?.quantity ?? 0,
            })}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}>
          <div className="space-y-2">
            <Label htmlFor="repaired-quantity">{t("inventory.repaired.quantity")} *</Label>
            <Input
              id="repaired-quantity"
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
              disabled={isSubmitting || markAsRepairedMutation.isPending}
            >
              {t("inventory.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!item || isSubmitting || markAsRepairedMutation.isPending}
            >
              {t("inventory.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </MotionDialogContent>
    </Dialog>
  )
}
