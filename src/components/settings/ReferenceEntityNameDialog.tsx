import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { useFocusOnOpen } from "@/hooks/useFocusOnMount"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"

type ReferenceEntityNameDialogProps = {
  open: boolean
  mode: "create" | "edit"
  titleKey: string
  labelKey: string
  placeholderKey: string
  validationRequiredKey: string
  inputId: string
  initialName?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => void
}

export function ReferenceEntityNameDialog({
  open,
  mode,
  titleKey,
  labelKey,
  placeholderKey,
  validationRequiredKey,
  inputId,
  initialName = "",
  isPending,
  onOpenChange,
  onSubmit,
}: ReferenceEntityNameDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState("")
  const nameInputRef = useFocusOnOpen<HTMLInputElement>(open)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setError("")
    }
  }, [initialName, open])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("")
      setError("")
    }
    onOpenChange(next)
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t(validationRequiredKey))
      return
    }
    if (trimmed.length > INVENTORY_FIELD_LIMITS.entityName) {
      setError(t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.entityName }))
      return
    }
    onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <MotionDialogContent
        open={open}
        className="max-w-sm"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={inputId}>{t(labelKey)}</Label>
          <Input
            ref={nameInputRef}
            id={inputId}
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleSubmit()
              }
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t("inventory.actions.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {mode === "edit" ? t("settings.inventory.save") : t("settings.inventory.create")}
          </Button>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
