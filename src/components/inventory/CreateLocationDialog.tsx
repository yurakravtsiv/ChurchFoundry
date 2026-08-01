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
import { createLocation } from "@/lib/inventoryStorage"
import type { Location } from "@/types/inventory"

type CreateLocationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (location: Location) => void
}

export function CreateLocationDialog({ open, onOpenChange, onCreated }: CreateLocationDialogProps) {
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
      setError(t("inventory.form.validation.locationNameRequired"))
      return
    }
    const location = createLocation(trimmed)
    onCreated(location)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inventory.form.createLocationTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="create-location-name">{t("inventory.form.locationName")}</Label>
          <Input
            id="create-location-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) {
                setError("")
              }
            }}
            placeholder={t("inventory.form.locationNamePlaceholder")}
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
