import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"

type CreateReferenceEntityMutation<T> = {
  mutate: (name: string, options?: { onSuccess?: (entity: T) => void }) => void
  isPending: boolean
}

export type CreateReferenceEntityDialogProps<T> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (entity: T) => void
  titleKey: string
  labelKey: string
  placeholderKey: string
  validationRequiredKey: string
  inputIdPrefix: string
  createMutationHook: () => CreateReferenceEntityMutation<T>
}

export function CreateReferenceEntityDialog<T>({
  open,
  onOpenChange,
  onCreated,
  titleKey,
  labelKey,
  placeholderKey,
  validationRequiredKey,
  inputIdPrefix,
  createMutationHook,
}: CreateReferenceEntityDialogProps<T>) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const mutation = createMutationHook()

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
      setError(t(validationRequiredKey))
      return
    }
    if (trimmed.length > INVENTORY_FIELD_LIMITS.entityName) {
      setError(t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.entityName }))
      return
    }
    mutation.mutate(trimmed, {
      onSuccess: (entity) => {
        onCreated(entity)
        handleOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <MotionDialogContent open={open} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={inputIdPrefix}>{t(labelKey)}</Label>
          <Input
            id={inputIdPrefix}
            className="my-[16px]"
            value={name}
            maxLength={INVENTORY_FIELD_LIMITS.entityName}
            onChange={(event) => {
              setName(event.target.value)
              if (error) {
                setError("")
              }
            }}
            placeholder={t(placeholderKey)}
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
          <Button type="button" onClick={handleCreate} disabled={mutation.isPending}>
            {t("inventory.form.createAction")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
