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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { useCreateSubcategoryMutation } from "@/hooks/queries/useInventoryQueries"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import type { Subcategory } from "@/types/inventory"

type CreateSubcategoryDialogProps = {
  open: boolean
  categoryId: string
  categoryName: string
  onOpenChange: (open: boolean) => void
  onCreated: (subcategory: Subcategory) => void
}

export function CreateSubcategoryDialog({
  open,
  categoryId,
  categoryName,
  onOpenChange,
  onCreated,
}: CreateSubcategoryDialogProps) {
  const { t } = useTranslation()
  const createSubcategoryMutation = useCreateSubcategoryMutation()
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const reset = () => {
    setName("")
    setError("")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    onOpenChange(next)
  }

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t("inventory.form.validation.subcategoryNameRequired"))
      return
    }
    if (trimmed.length > INVENTORY_FIELD_LIMITS.entityName) {
      setError(t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.entityName }))
      return
    }
    if (!categoryId) {
      setError(t("inventory.form.validation.categoryRequired"))
      return
    }
    createSubcategoryMutation.mutate(
      { categoryId, name: trimmed },
      {
        onSuccess: (subcategory) => {
          onCreated(subcategory)
          handleOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <MotionDialogContent open={open} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inventory.form.createSubcategoryTitle")}</DialogTitle>
          <DialogDescription>
            {t("inventory.form.createSubcategoryFor", { category: categoryName })}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-2">
          <Label htmlFor="create-subcategory-name">{t("inventory.form.subcategoryName")}</Label>
          <Input
            id="create-subcategory-name"
            value={name}
            maxLength={INVENTORY_FIELD_LIMITS.entityName}
            onChange={(event) => {
              setName(event.target.value)
              if (error) {
                setError("")
              }
            }}
            placeholder={t("inventory.form.subcategoryNamePlaceholder")}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleCreate()
              }
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t("inventory.actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={createSubcategoryMutation.isPending}
          >
            {t("inventory.form.createAction")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
