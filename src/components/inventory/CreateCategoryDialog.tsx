import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCategory } from "@/lib/inventoryStorage"
import type { Category } from "@/types/inventory"

type CreateCategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (category: Category) => void
}

export function CreateCategoryDialog({ open, onOpenChange, onCreated }: CreateCategoryDialogProps) {
  const { t } = useTranslation()
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
      setError(t("inventory.form.validation.categoryNameRequired"))
      return
    }
    const category = createCategory(trimmed)
    onCreated(category)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inventory.form.createCategoryTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="create-category-name">{t("inventory.form.categoryName")}</Label>
          <Input
            id="create-category-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) {
                setError("")
              }
            }}
            placeholder={t("inventory.form.categoryNamePlaceholder")}
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
          <Button type="button" onClick={handleCreate}>
            {t("inventory.form.createAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
