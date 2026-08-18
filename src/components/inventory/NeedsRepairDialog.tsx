import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { type Resolver, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { toDateInputValue as formatDateForStorage } from "@/components/ui/date-picker"
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
import { Textarea } from "@/components/ui/textarea"
import { useMarkAsNeedsRepairMutation } from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import type { InventoryItem } from "@/types/inventory"

type NeedsRepairDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

type NeedsRepairFormValues = {
  quantity: number
  repairDate: string
  repairComment: string
}

function todayDateInputValue() {
  return formatDateForStorage(new Date())
}

export function NeedsRepairDialog({ item, open, onOpenChange, onConfirm }: NeedsRepairDialogProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const needsRepairMutation = useMarkAsNeedsRepairMutation()
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
            .number({ error: t("inventory.needsRepair.validation.quantityInvalid") })
            .int(t("inventory.needsRepair.validation.quantityInvalid"))
            .min(1, t("inventory.needsRepair.validation.quantityMin"))
            .max(
              maxQuantity,
              t("inventory.needsRepair.validation.quantityMax", { quantity: maxQuantity }),
            ),
        ),
        repairDate: z.string().min(1, t("inventory.needsRepair.validation.dateRequired")),
        repairComment: z
          .string()
          .trim()
          .min(1, t("inventory.needsRepair.validation.commentRequired"))
          .max(
            INVENTORY_FIELD_LIMITS.repairComment,
            t("inventory.form.validation.stringMax", {
              max: INVENTORY_FIELD_LIMITS.repairComment,
            }),
          ),
      }),
    [maxQuantity, t],
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NeedsRepairFormValues>({
    resolver: zodResolver(schema) as Resolver<NeedsRepairFormValues>,
    defaultValues: {
      quantity: 1,
      repairDate: todayDateInputValue(),
      repairComment: "",
    },
  })

  const commentValue = watch("repairComment") ?? ""

  useEffect(() => {
    if (!open || !item) {
      return
    }
    reset({
      quantity: 1,
      repairDate: todayDateInputValue(),
      repairComment: "",
    })
  }, [item, open, reset])

  const submit = handleSubmit((values) => {
    if (!item) {
      return
    }
    needsRepairMutation.mutate(
      {
        id: item.id,
        quantity: values.quantity,
        repairDate: values.repairDate,
        repairComment: values.repairComment.trim(),
        userEmail: user?.email ?? "",
      },
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
          <DialogTitle>{t("inventory.needsRepair.title", { name: item?.name ?? "" })}</DialogTitle>
          <DialogDescription>
            {t("inventory.needsRepair.description", { quantity: item?.quantity ?? 0 })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-2">
            <Label htmlFor="needs-repair-quantity">{t("inventory.needsRepair.quantity")} *</Label>
            <Input
              id="needs-repair-quantity"
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

          <div className="space-y-2">
            <Label htmlFor="needs-repair-date">{t("inventory.needsRepair.date")} *</Label>
            <Input
              id="needs-repair-date"
              type="date"
              aria-label={t("inventory.needsRepair.date")}
              max={formatDateForStorage(new Date())}
              {...register("repairDate")}
            />
            {errors.repairDate ? (
              <p className="text-sm text-destructive">{errors.repairDate.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="needs-repair-comment">{t("inventory.needsRepair.comment")} *</Label>
            <Textarea
              id="needs-repair-comment"
              rows={4}
              className="resize-none"
              maxLength={INVENTORY_FIELD_LIMITS.repairComment}
              {...register("repairComment")}
            />
            <p className="text-xs text-muted-foreground">
              {commentValue.length}/{INVENTORY_FIELD_LIMITS.repairComment}
            </p>
            {errors.repairComment ? (
              <p className="text-sm text-destructive">{errors.repairComment.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || needsRepairMutation.isPending}
            >
              {t("inventory.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || needsRepairMutation.isPending || !item}>
              {t("inventory.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </MotionDialogContent>
    </Dialog>
  )
}
