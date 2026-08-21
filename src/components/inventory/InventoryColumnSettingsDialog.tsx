import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { Switch } from "@/components/ui/switch"
import {
  getDefaultColumnPrefs,
  INVENTORY_COLUMN_DEFINITION_BY_ID,
  type InventoryColumnId,
  type InventoryColumnPrefs,
  isDefaultColumnPrefs,
  mergeColumnPrefs,
} from "@/lib/inventoryColumnConfig"
import { cn } from "@/lib/utils"

type InventoryColumnSettingsDialogProps = {
  open: boolean
  prefs: InventoryColumnPrefs
  onOpenChange: (open: boolean) => void
  onSave: (prefs: InventoryColumnPrefs) => void
}

function SortableColumnRow({
  id,
  label,
  visible,
  required,
  onVisibleChange,
  dragHandleLabel,
}: {
  id: InventoryColumnId
  label: string
  visible: boolean
  required: boolean
  onVisibleChange: (visible: boolean) => void
  dragHandleLabel: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const switchId = `inventory-column-visible-${id}`

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-2",
        isDragging && "z-10 shadow-md",
      )}
    >
      <button
        type="button"
        className="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground touch-none hover:bg-muted hover:text-foreground"
        aria-label={dragHandleLabel}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <Label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer leading-snug">
        {label}
      </Label>
      <Switch
        id={switchId}
        size="sm"
        checked={visible}
        disabled={required}
        onCheckedChange={onVisibleChange}
      />
    </div>
  )
}

export function InventoryColumnSettingsDialog({
  open,
  prefs,
  onOpenChange,
  onSave,
}: InventoryColumnSettingsDialogProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<InventoryColumnPrefs>(() => mergeColumnPrefs(prefs))

  useEffect(() => {
    if (open) {
      setDraft(mergeColumnPrefs(prefs))
    }
  }, [open, prefs])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const hiddenSet = useMemo(() => new Set(draft.hidden), [draft.hidden])
  const resetDisabled = isDefaultColumnPrefs(draft)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    setDraft((current) => {
      const oldIndex = current.order.indexOf(active.id as InventoryColumnId)
      const newIndex = current.order.indexOf(over.id as InventoryColumnId)
      if (oldIndex < 0 || newIndex < 0) {
        return current
      }
      return { ...current, order: arrayMove(current.order, oldIndex, newIndex) }
    })
  }

  const setColumnVisible = (id: InventoryColumnId, visible: boolean) => {
    if (INVENTORY_COLUMN_DEFINITION_BY_ID[id].required) {
      return
    }
    setDraft((current) => {
      const nextHidden = new Set(current.hidden)
      if (visible) {
        nextHidden.delete(id)
      } else {
        nextHidden.add(id)
      }
      return { ...current, hidden: [...nextHidden] }
    })
  }

  const handleReset = () => {
    setDraft(getDefaultColumnPrefs())
  }

  const handleSave = () => {
    onSave(mergeColumnPrefs(draft))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MotionDialogContent open={open} className="max-w-md">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>{t("inventory.columnSettings.title")}</DialogTitle>
          <DialogDescription>{t("inventory.columnSettings.hint")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 max-h-[min(50vh,24rem)] flex-1 overflow-y-auto py-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={draft.order} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {draft.order.map((id) => {
                  const required = INVENTORY_COLUMN_DEFINITION_BY_ID[id].required === true
                  return (
                    <li key={id}>
                      <SortableColumnRow
                        id={id}
                        label={t(`inventory.columns.${id}`)}
                        visible={required || !hiddenSet.has(id)}
                        required={required}
                        onVisibleChange={(visible) => setColumnVisible(id, visible)}
                        dragHandleLabel={t("inventory.columnSettings.dragHandle")}
                      />
                    </li>
                  )
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={resetDisabled}>
            {t("inventory.columnSettings.reset")}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inventory.columnSettings.cancel")}
            </Button>
            <Button type="button" onClick={handleSave}>
              {t("inventory.columnSettings.save")}
            </Button>
          </div>
        </DialogFooter>
      </MotionDialogContent>
    </Dialog>
  )
}
