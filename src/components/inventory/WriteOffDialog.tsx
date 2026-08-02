import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { Controller, type Resolver, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  DatePicker,
  toDateInputValue as formatDateForStorage,
  parseDateInputValue,
} from "@/components/ui/date-picker"
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
import { useWriteOffItemMutation } from "@/hooks/queries/useInventoryQueries"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import type { InventoryItem } from "@/types/inventory"

type WriteOffDialogProps = {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

type WriteOffFormValues = {
  quantity: number
  writeOffDate: string
  writeOffReason: string
}

function todayDateInputValue() {
  return formatDateForStorage(new Date())
}

export function WriteOffDialog({ item, open, onOpenChange, onConfirm }: WriteOffDialogProps) {
  const { t } = useTranslation()
  const writeOffMutation = useWriteOffItemMutation()
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
            .number({ error: t("inventory.writeOff.validation.quantityInvalid") })
            .int(t("inventory.writeOff.validation.quantityInvalid"))
            .min(1, t("inventory.writeOff.validation.quantityMin"))
            .max(
              maxQuantity,
              t("inventory.writeOff.validation.quantityMax", { quantity: maxQuantity }),
            ),
        ),
        writeOffDate: z.string().min(1, t("inventory.writeOff.validation.dateRequired")),
        writeOffReason: z
          .string()
          .trim()
          .min(1, t("inventory.writeOff.validation.reasonRequired"))
          .max(
            INVENTORY_FIELD_LIMITS.writeOffReason,
            t("inventory.form.validation.stringMax", {
              max: INVENTORY_FIELD_LIMITS.writeOffReason,
            }),
          ),
      }),
    [maxQuantity, t],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WriteOffFormValues>({
    resolver: zodResolver(schema) as Resolver<WriteOffFormValues>,
    defaultValues: {
      quantity: 1,
      writeOffDate: todayDateInputValue(),
      writeOffReason: "",
    },
  })

  const reasonValue = watch("writeOffReason") ?? ""

  useEffect(() => {
    if (!open || !item) {
      return
    }
    reset({
      quantity: 1,
      writeOffDate: todayDateInputValue(),
      writeOffReason: "",
    })
  }, [item, open, reset])

  const submit = handleSubmit((values) => {
    if (!item) {
      return
    }
    writeOffMutation.mutate(
      {
        id: item.id,
        quantity: values.quantity,
        writeOffDate: values.writeOffDate,
        writeOffReason: values.writeOffReason.trim(),
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
          <DialogTitle>{t("inventory.writeOff.title", { name: item?.name ?? "" })}</DialogTitle>
          <DialogDescription>
            {t("inventory.writeOff.description", { quantity: item?.quantity ?? 0 })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-2">
            <Label htmlFor="write-off-quantity">{t("inventory.writeOff.quantity")} *</Label>
            <Input
              id="write-off-quantity"
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
            <Label htmlFor="write-off-date">{t("inventory.writeOff.date")} *</Label>
            <Controller
              control={control}
              name="writeOffDate"
              render={({ field }) => (
                <DatePicker
                  id="write-off-date"
                  aria-label={t("inventory.writeOff.date")}
                  value={parseDateInputValue(field.value)}
                  onChange={(date) => field.onChange(date ? formatDateForStorage(date) : "")}
                  toDate={new Date()}
                  placeholder={t("inventory.writeOff.datePlaceholder")}
                />
              )}
            />
            {errors.writeOffDate ? (
              <p className="text-sm text-destructive">{errors.writeOffDate.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="write-off-reason">{t("inventory.writeOff.reason")} *</Label>
            <Textarea
              id="write-off-reason"
              rows={4}
              className="resize-none"
              maxLength={INVENTORY_FIELD_LIMITS.writeOffReason}
              {...register("writeOffReason")}
            />
            <p className="text-xs text-muted-foreground">
              {reasonValue.length}/{INVENTORY_FIELD_LIMITS.writeOffReason}
            </p>
            {errors.writeOffReason ? (
              <p className="text-sm text-destructive">{errors.writeOffReason.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || writeOffMutation.isPending}
            >
              {t("inventory.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || writeOffMutation.isPending || !item}>
              {t("inventory.actions.writeOff")}
            </Button>
          </DialogFooter>
        </form>
      </MotionDialogContent>
    </Dialog>
  )
}
