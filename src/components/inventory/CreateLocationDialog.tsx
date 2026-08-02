import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { useCreateLocationMutation } from "@/hooks/queries/useInventoryQueries"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import type { Location } from "@/types/inventory"

type CreateLocationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (location: Location) => void
}

export function CreateLocationDialog({ open, onOpenChange, onCreated }: CreateLocationDialogProps) {
  const { t } = useTranslation()
  const createLocationMutation = useCreateLocationMutation()
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
    if (trimmed.length > INVENTORY_FIELD_LIMITS.entityName) {
      setError(t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.entityName }))
      return
    }
    createLocationMutation.mutate(trimmed, {
      onSuccess: (location) => {
        onCreated(location)
        handleOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <MotionDialogContent open={open} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("inventory.form.createLocationTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="create-location-name">{t("inventory.form.locationName")}</Label>
          <Input
            id="create-location-name"
            value={name}
            maxLength={INVENTORY_FIELD_LIMITS.entityName}
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
          <Button type="button" onClick={handleCreate} disabled={createLocationMutation.isPending}>
            {t("inventory.form.createAction")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
