import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFocusOnOpen } from "@/hooks/useFocusOnMount"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import type { Category } from "@/types/inventory"

type CreateSubcategorySettingsDialogProps = {
  open: boolean
  categories: Category[]
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { categoryId: string; name: string }) => void
}

export function CreateSubcategorySettingsDialog({
  open,
  categories,
  isPending,
  onOpenChange,
  onSubmit,
}: CreateSubcategorySettingsDialogProps) {
  const { t } = useTranslation()
  const [categoryId, setCategoryId] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const nameInputRef = useFocusOnOpen<HTMLInputElement>(open)

  useEffect(() => {
    if (open) {
      setCategoryId(categories.length === 1 ? (categories[0]?.id ?? "") : "")
      setName("")
      setError("")
    }
  }, [categories, open])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCategoryId("")
      setName("")
      setError("")
    }
    onOpenChange(next)
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!categoryId) {
      setError(t("inventory.form.validation.categoryRequired"))
      return
    }
    if (!trimmed) {
      setError(t("inventory.form.validation.subcategoryNameRequired"))
      return
    }
    if (trimmed.length > INVENTORY_FIELD_LIMITS.entityName) {
      setError(t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.entityName }))
      return
    }
    onSubmit({ categoryId, name: trimmed })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <MotionDialogContent
        open={open}
        className="max-w-sm"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("settings.inventory.createSubcategoryTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.inventory.categoryField")}</Label>
            <Select value={categoryId || undefined} onValueChange={setCategoryId}>
              <SelectTrigger aria-label={t("settings.inventory.categoryField")}>
                <SelectValue placeholder={t("settings.inventory.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-subcategory-name">{t("settings.inventory.name")}</Label>
            <Input
              ref={nameInputRef}
              id="settings-subcategory-name"
              value={name}
              maxLength={INVENTORY_FIELD_LIMITS.entityName}
              onChange={(event) => {
                setName(event.target.value)
                if (error) {
                  setError("")
                }
              }}
              placeholder={t("inventory.form.subcategoryNamePlaceholder")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t("inventory.actions.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {t("settings.inventory.create")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
