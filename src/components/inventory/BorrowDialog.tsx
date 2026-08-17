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
import { useMarkAsBorrowedMutation } from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import type { InventoryItem } from "@/types/inventory"

type BorrowDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

type BorrowFormValues = {
  quantity: number
  borrowDate: string
  availabilityComment: string
}

function todayDateInputValue() {
  return formatDateForStorage(new Date())
}

export function BorrowDialog({ item, open, onOpenChange, onConfirm }: BorrowDialogProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const borrowMutation = useMarkAsBorrowedMutation()
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
            .number({ error: t("inventory.borrow.validation.quantityInvalid") })
            .int(t("inventory.borrow.validation.quantityInvalid"))
            .min(1, t("inventory.borrow.validation.quantityMin"))
            .max(
              maxQuantity,
              t("inventory.borrow.validation.quantityMax", { quantity: maxQuantity }),
            ),
        ),
        borrowDate: z.string().min(1, t("inventory.borrow.validation.dateRequired")),
        availabilityComment: z
          .string()
          .trim()
          .min(1, t("inventory.borrow.validation.commentRequired"))
          .max(
            INVENTORY_FIELD_LIMITS.availabilityComment,
            t("inventory.form.validation.stringMax", {
              max: INVENTORY_FIELD_LIMITS.availabilityComment,
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
  } = useForm<BorrowFormValues>({
    resolver: zodResolver(schema) as Resolver<BorrowFormValues>,
    defaultValues: {
      quantity: 1,
      borrowDate: todayDateInputValue(),
      availabilityComment: "",
    },
  })

  const commentValue = watch("availabilityComment") ?? ""

  useEffect(() => {
    if (!open || !item) {
      return
    }
    reset({
      quantity: 1,
      borrowDate: todayDateInputValue(),
      availabilityComment: "",
    })
  }, [item, open, reset])

  const submit = handleSubmit((values) => {
    if (!item) {
      return
    }
    borrowMutation.mutate(
      {
        id: item.id,
        quantity: values.quantity,
        borrowDate: values.borrowDate,
        availabilityComment: values.availabilityComment.trim(),
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
          <DialogTitle>{t("inventory.borrow.title", { name: item?.name ?? "" })}</DialogTitle>
          <DialogDescription>
            {t("inventory.borrow.description", { quantity: item?.quantity ?? 0 })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-2">
            <Label htmlFor="borrow-quantity">{t("inventory.borrow.quantity")} *</Label>
            <Input
              id="borrow-quantity"
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
            <Label htmlFor="borrow-date">{t("inventory.borrow.date")} *</Label>
            <Input
              id="borrow-date"
              type="date"
              aria-label={t("inventory.borrow.date")}
              max={formatDateForStorage(new Date())}
              {...register("borrowDate")}
            />
            {errors.borrowDate ? (
              <p className="text-sm text-destructive">{errors.borrowDate.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="borrow-comment">{t("inventory.borrow.comment")} *</Label>
            <Textarea
              id="borrow-comment"
              rows={4}
              className="resize-none"
              maxLength={INVENTORY_FIELD_LIMITS.availabilityComment}
              placeholder={t("inventory.borrow.commentPlaceholder")}
              {...register("availabilityComment")}
            />
            <p className="text-xs text-muted-foreground">
              {commentValue.length}/{INVENTORY_FIELD_LIMITS.availabilityComment}
            </p>
            {errors.availabilityComment ? (
              <p className="text-sm text-destructive">{errors.availabilityComment.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || borrowMutation.isPending}
            >
              {t("inventory.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || borrowMutation.isPending || !item}>
              {t("inventory.actions.markBorrowed")}
            </Button>
          </DialogFooter>
        </form>
      </MotionDialogContent>
    </Dialog>
  )
}
