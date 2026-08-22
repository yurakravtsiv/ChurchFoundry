import { Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { CreateSubcategorySettingsDialog } from "@/components/settings/CreateSubcategorySettingsDialog"
import { ReferenceEntityNameDialog } from "@/components/settings/ReferenceEntityNameDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DisabledTooltip } from "@/components/ui/disabled-tooltip"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { QueryErrorState } from "@/components/ui/query-error-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateLocationMutation,
  useCreateResponsibleMutation,
  useCreateSubcategoryMutation,
  useDeleteCategoryMutation,
  useDeleteLocationMutation,
  useDeleteResponsibleMutation,
  useDeleteSubcategoryMutation,
  useInventoryItemsQuery,
  useLocationsQuery,
  useResponsiblesQuery,
  useSubcategoriesQuery,
  useUpdateCategoryMutation,
  useUpdateLocationMutation,
  useUpdateResponsibleMutation,
  useUpdateSubcategoryMutation,
} from "@/hooks/queries/useInventoryQueries"
import { sortByName } from "@/lib/localeCompare"
import type { Category, Location, Responsible, Subcategory } from "@/types/inventory"

type NameDialogState =
  | { kind: "category"; mode: "create" }
  | { kind: "category"; mode: "edit"; entity: Category }
  | { kind: "subcategory"; mode: "edit"; entity: Subcategory }
  | { kind: "location"; mode: "create" }
  | { kind: "location"; mode: "edit"; entity: Location }
  | { kind: "responsible"; mode: "create" }
  | { kind: "responsible"; mode: "edit"; entity: Responsible }

type DeleteState =
  | { kind: "category"; entity: Category; usageCount: number }
  | { kind: "subcategory"; entity: Subcategory; usageCount: number }
  | { kind: "location"; entity: Location; usageCount: number }
  | { kind: "responsible"; entity: Responsible; usageCount: number }

function EntityRow({
  name,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: {
  name: string
  editLabel: string
  deleteLabel: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <span className="min-w-0 truncate text-sm">{name}</span>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onEdit}>
          <Pencil className="size-4" />
          <span className="sr-only">{editLabel}</span>
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onDelete}>
          <Trash2 className="size-4" />
          <span className="sr-only">{deleteLabel}</span>
        </Button>
      </div>
    </li>
  )
}

export function InventorySettingsTab() {
  const { t, i18n } = useTranslation()
  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useInventoryItemsQuery()
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategoriesQuery()
  const {
    data: subcategories = [],
    isLoading: subcategoriesLoading,
    isError: subcategoriesError,
    refetch: refetchSubcategories,
  } = useSubcategoriesQuery()
  const {
    data: locations = [],
    isLoading: locationsLoading,
    isError: locationsError,
    refetch: refetchLocations,
  } = useLocationsQuery()
  const {
    data: responsibles = [],
    isLoading: responsiblesLoading,
    isError: responsiblesError,
    refetch: refetchResponsibles,
  } = useResponsiblesQuery()

  const createCategoryMutation = useCreateCategoryMutation()
  const updateCategoryMutation = useUpdateCategoryMutation()
  const deleteCategoryMutation = useDeleteCategoryMutation()
  const createSubcategoryMutation = useCreateSubcategoryMutation()
  const updateSubcategoryMutation = useUpdateSubcategoryMutation()
  const deleteSubcategoryMutation = useDeleteSubcategoryMutation()
  const createLocationMutation = useCreateLocationMutation()
  const updateLocationMutation = useUpdateLocationMutation()
  const deleteLocationMutation = useDeleteLocationMutation()
  const createResponsibleMutation = useCreateResponsibleMutation()
  const updateResponsibleMutation = useUpdateResponsibleMutation()
  const deleteResponsibleMutation = useDeleteResponsibleMutation()

  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null)
  const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false)
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null)

  const isLoading =
    itemsLoading ||
    categoriesLoading ||
    subcategoriesLoading ||
    locationsLoading ||
    responsiblesLoading
  const isError =
    itemsError || categoriesError || subcategoriesError || locationsError || responsiblesError

  const sortedCategories = useMemo(
    () => sortByName(categories, i18n.language),
    [categories, i18n.language],
  )
  const sortedLocations = useMemo(
    () => sortByName(locations, i18n.language),
    [i18n.language, locations],
  )
  const sortedResponsibles = useMemo(
    () => sortByName(responsibles, i18n.language),
    [i18n.language, responsibles],
  )

  const subcategoriesByCategory = useMemo(() => {
    return sortedCategories.map((category) => ({
      category,
      items: sortByName(
        subcategories.filter((subcategory) => subcategory.categoryId === category.id),
        i18n.language,
      ),
    }))
  }, [i18n.language, sortedCategories, subcategories])

  const nameDialogMeta = useMemo(() => {
    if (!nameDialog) {
      return null
    }
    if (nameDialog.kind === "category") {
      return {
        titleKey:
          nameDialog.mode === "create"
            ? "settings.inventory.createCategoryTitle"
            : "settings.inventory.editCategoryTitle",
        labelKey: "inventory.form.categoryName",
        placeholderKey: "inventory.form.categoryNamePlaceholder",
        validationRequiredKey: "inventory.form.validation.categoryNameRequired",
        inputId: "settings-category-name",
        initialName: nameDialog.mode === "edit" ? nameDialog.entity.name : "",
        isPending: createCategoryMutation.isPending || updateCategoryMutation.isPending,
      }
    }
    if (nameDialog.kind === "subcategory") {
      return {
        titleKey: "settings.inventory.editSubcategoryTitle",
        labelKey: "inventory.form.subcategoryName",
        placeholderKey: "inventory.form.subcategoryNamePlaceholder",
        validationRequiredKey: "inventory.form.validation.subcategoryNameRequired",
        inputId: "settings-subcategory-name-edit",
        initialName: nameDialog.entity.name,
        isPending: updateSubcategoryMutation.isPending,
      }
    }
    if (nameDialog.kind === "location") {
      return {
        titleKey:
          nameDialog.mode === "create"
            ? "settings.inventory.createLocationTitle"
            : "settings.inventory.editLocationTitle",
        labelKey: "inventory.form.locationName",
        placeholderKey: "inventory.form.locationNamePlaceholder",
        validationRequiredKey: "inventory.form.validation.locationNameRequired",
        inputId: "settings-location-name",
        initialName: nameDialog.mode === "edit" ? nameDialog.entity.name : "",
        isPending: createLocationMutation.isPending || updateLocationMutation.isPending,
      }
    }
    return {
      titleKey:
        nameDialog.mode === "create"
          ? "settings.inventory.createResponsibleTitle"
          : "settings.inventory.editResponsibleTitle",
      labelKey: "inventory.form.responsibleName",
      placeholderKey: "inventory.form.responsibleNamePlaceholder",
      validationRequiredKey: "inventory.form.validation.responsibleNameRequired",
      inputId: "settings-responsible-name",
      initialName: nameDialog.mode === "edit" ? nameDialog.entity.name : "",
      isPending: createResponsibleMutation.isPending || updateResponsibleMutation.isPending,
    }
  }, [
    createCategoryMutation.isPending,
    createLocationMutation.isPending,
    createResponsibleMutation.isPending,
    nameDialog,
    updateCategoryMutation.isPending,
    updateLocationMutation.isPending,
    updateResponsibleMutation.isPending,
    updateSubcategoryMutation.isPending,
  ])

  const handleNameSubmit = (name: string) => {
    if (!nameDialog) {
      return
    }
    if (nameDialog.kind === "category" && nameDialog.mode === "create") {
      createCategoryMutation.mutate(name, { onSuccess: () => setNameDialog(null) })
      return
    }
    if (nameDialog.kind === "category" && nameDialog.mode === "edit") {
      updateCategoryMutation.mutate(
        { id: nameDialog.entity.id, name },
        { onSuccess: () => setNameDialog(null) },
      )
      return
    }
    if (nameDialog.kind === "subcategory") {
      updateSubcategoryMutation.mutate(
        { id: nameDialog.entity.id, name },
        { onSuccess: () => setNameDialog(null) },
      )
      return
    }
    if (nameDialog.kind === "location") {
      if (nameDialog.mode === "create") {
        createLocationMutation.mutate(name, { onSuccess: () => setNameDialog(null) })
        return
      }
      updateLocationMutation.mutate(
        { id: nameDialog.entity.id, name },
        { onSuccess: () => setNameDialog(null) },
      )
      return
    }
    if (nameDialog.mode === "create") {
      createResponsibleMutation.mutate(name, { onSuccess: () => setNameDialog(null) })
      return
    }
    updateResponsibleMutation.mutate(
      { id: nameDialog.entity.id, name },
      { onSuccess: () => setNameDialog(null) },
    )
  }

  const handleConfirmDelete = () => {
    if (!deleteState) {
      return
    }
    const onSuccess = () => setDeleteState(null)
    if (deleteState.kind === "category") {
      deleteCategoryMutation.mutate(deleteState.entity.id, { onSuccess })
      return
    }
    if (deleteState.kind === "subcategory") {
      deleteSubcategoryMutation.mutate(deleteState.entity.id, { onSuccess })
      return
    }
    if (deleteState.kind === "location") {
      deleteLocationMutation.mutate(deleteState.entity.id, { onSuccess })
      return
    }
    deleteResponsibleMutation.mutate(deleteState.entity.id, { onSuccess })
  }

  const isDeleting =
    deleteCategoryMutation.isPending ||
    deleteSubcategoryMutation.isPending ||
    deleteLocationMutation.isPending ||
    deleteResponsibleMutation.isPending

  if (isError) {
    return (
      <QueryErrorState
        onRetry={() => {
          void refetchItems()
          void refetchCategories()
          void refetchSubcategories()
          void refetchLocations()
          void refetchResponsibles()
        }}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 py-4">
          <CardTitle className="text-base">{t("settings.inventory.categories")}</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => setNameDialog({ kind: "category", mode: "create" })}
          >
            <Plus className="size-4" />
            {t("settings.inventory.create")}
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.inventory.emptyCategories")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sortedCategories.map((category) => (
                <EntityRow
                  key={category.id}
                  name={category.name}
                  editLabel={t("settings.inventory.edit")}
                  deleteLabel={t("settings.inventory.delete")}
                  onEdit={() => setNameDialog({ kind: "category", mode: "edit", entity: category })}
                  onDelete={() =>
                    setDeleteState({
                      kind: "category",
                      entity: category,
                      usageCount: items.filter((item) => item.categoryId === category.id).length,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 py-4">
          <CardTitle className="text-base">{t("settings.inventory.subcategories")}</CardTitle>
          <DisabledTooltip
            disabled={categories.length === 0}
            tip={t("settings.inventory.createDisabledNoCategory")}
          >
            <Button
              type="button"
              size="sm"
              disabled={categories.length === 0}
              onClick={() => setCreateSubcategoryOpen(true)}
            >
              <Plus className="size-4" />
              {t("settings.inventory.create")}
            </Button>
          </DisabledTooltip>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.inventory.emptySubcategories")}
            </p>
          ) : (
            <div className="space-y-4">
              {subcategoriesByCategory.map(({ category, items: groupItems }) => (
                <div key={category.id} className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {category.name}
                  </p>
                  {groupItems.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                      {t("settings.inventory.emptyGroup")}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {groupItems.map((subcategory) => (
                        <EntityRow
                          key={subcategory.id}
                          name={subcategory.name}
                          editLabel={t("settings.inventory.edit")}
                          deleteLabel={t("settings.inventory.delete")}
                          onEdit={() =>
                            setNameDialog({
                              kind: "subcategory",
                              mode: "edit",
                              entity: subcategory,
                            })
                          }
                          onDelete={() =>
                            setDeleteState({
                              kind: "subcategory",
                              entity: subcategory,
                              usageCount: items.filter(
                                (item) => item.subcategoryId === subcategory.id,
                              ).length,
                            })
                          }
                        />
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 py-4">
          <CardTitle className="text-base">{t("settings.inventory.locations")}</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => setNameDialog({ kind: "location", mode: "create" })}
          >
            <Plus className="size-4" />
            {t("settings.inventory.create")}
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.inventory.emptyLocations")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sortedLocations.map((location) => (
                <EntityRow
                  key={location.id}
                  name={location.name}
                  editLabel={t("settings.inventory.edit")}
                  deleteLabel={t("settings.inventory.delete")}
                  onEdit={() => setNameDialog({ kind: "location", mode: "edit", entity: location })}
                  onDelete={() =>
                    setDeleteState({
                      kind: "location",
                      entity: location,
                      usageCount: items.filter((item) => item.locationId === location.id).length,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 py-4">
          <CardTitle className="text-base">{t("settings.inventory.responsibles")}</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => setNameDialog({ kind: "responsible", mode: "create" })}
          >
            <Plus className="size-4" />
            {t("settings.inventory.create")}
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {sortedResponsibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.inventory.emptyResponsibles")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sortedResponsibles.map((responsible) => (
                <EntityRow
                  key={responsible.id}
                  name={responsible.name}
                  editLabel={t("settings.inventory.edit")}
                  deleteLabel={t("settings.inventory.delete")}
                  onEdit={() =>
                    setNameDialog({ kind: "responsible", mode: "edit", entity: responsible })
                  }
                  onDelete={() =>
                    setDeleteState({
                      kind: "responsible",
                      entity: responsible,
                      usageCount: items.filter((item) => item.responsibleId === responsible.id)
                        .length,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {nameDialogMeta ? (
        <ReferenceEntityNameDialog
          open={nameDialog !== null}
          mode={nameDialog?.mode === "edit" ? "edit" : "create"}
          titleKey={nameDialogMeta.titleKey}
          labelKey={nameDialogMeta.labelKey}
          placeholderKey={nameDialogMeta.placeholderKey}
          validationRequiredKey={nameDialogMeta.validationRequiredKey}
          inputId={nameDialogMeta.inputId}
          initialName={nameDialogMeta.initialName}
          isPending={nameDialogMeta.isPending}
          onOpenChange={(open) => {
            if (!open) {
              setNameDialog(null)
            }
          }}
          onSubmit={handleNameSubmit}
        />
      ) : null}

      <CreateSubcategorySettingsDialog
        open={createSubcategoryOpen}
        categories={sortedCategories}
        isPending={createSubcategoryMutation.isPending}
        onOpenChange={setCreateSubcategoryOpen}
        onSubmit={(payload) => {
          createSubcategoryMutation.mutate(payload, {
            onSuccess: () => setCreateSubcategoryOpen(false),
          })
        }}
      />

      <Dialog
        open={deleteState !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteState(null)
          }
        }}
      >
        <MotionDialogContent open={deleteState !== null} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("settings.inventory.deleteTitle", { name: deleteState?.entity.name ?? "" })}
            </DialogTitle>
            <DialogDescription>
              {deleteState && deleteState.usageCount > 0
                ? t("settings.inventory.deleteInUseDescription", { count: deleteState.usageCount })
                : t("settings.inventory.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteState(null)}
            >
              {t("inventory.actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {t("settings.inventory.delete")}
            </Button>
          </DialogFooter>
        </MotionDialogContent>
      </Dialog>
    </div>
  )
}
