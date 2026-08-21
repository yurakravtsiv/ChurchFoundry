import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Plus, Star, X } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { CreateReferenceEntityDialog } from "@/components/inventory/CreateReferenceEntityDialog"
import { CreateSubcategoryDialog } from "@/components/inventory/CreateSubcategoryDialog"
import { Button } from "@/components/ui/button"
import { DisabledTooltip } from "@/components/ui/disabled-tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateLocationMutation,
  useInventoryReferenceLookupsQuery,
  useLocationsQuery,
  useSubcategoriesQuery,
} from "@/hooks/queries/useInventoryQueries"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import { optionsWithCurrent } from "@/lib/inventoryReferenceOptions"
import { compressImage } from "@/lib/inventoryStorage"
import { cn } from "@/lib/utils"
import type {
  Category,
  CreateInventoryItemInput,
  InventoryItem,
  InventoryPhoto,
  Location,
} from "@/types/inventory"

export type InventoryItemFormValues = CreateInventoryItemInput

export type InventoryItemFormHandle = {
  /** Validate all fields and scroll to the first error when invalid. */
  validate: () => Promise<boolean>
}

type InventoryItemFormProps = {
  mode: "create" | "edit"
  initialData?: InventoryItem
  onSubmit: (data: InventoryItemFormValues) => void
  onCancel: () => void
  onInvalid?: () => void
  onDirtyChange?: (dirty: boolean) => void
  /** Overrides the default save button label (e.g. brief “Saved” feedback). */
  submitLabel?: string
  /**
   * `dialog` — sticky footer, scrollable body inside a constrained popup.
   * `page` — natural page flow; action buttons are omitted (render them outside via `id`).
   */
  layout?: "dialog" | "page"
  /** Form element id — use with external submit buttons (`form` attribute). */
  id?: string
  onBusyChange?: (busy: boolean) => void
  /** Disables all fields (e.g. written-off items). */
  readOnly?: boolean
  /** Focus the name field after the form mounts (create dialog / edit page). */
  autoFocusFirstField?: boolean
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return ""
  }
  // Accept full ISO or already YYYY-MM-DD.
  return value.slice(0, 10)
}

/** Non-selectable action row inside a Select — never becomes the Select value. */
function SelectCreateAction({
  label,
  disabled,
  onCreate,
}: {
  label: string
  disabled?: boolean
  onCreate: () => void
}) {
  return (
    <div className="mt-1 border-t border-border p-1">
      <button
        type="button"
        disabled={disabled}
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={() => {
          if (disabled) {
            return
          }
          onCreate()
        }}
      >
        <Plus className="size-3.5" aria-hidden />
        {label}
      </button>
    </div>
  )
}

export const InventoryItemForm = forwardRef<InventoryItemFormHandle, InventoryItemFormProps>(
  function InventoryItemForm(
    {
      mode: _mode,
      initialData,
      onSubmit,
      onCancel,
      onInvalid,
      onDirtyChange,
      submitLabel,
      layout = "dialog",
      id,
      onBusyChange,
      readOnly = false,
      autoFocusFirstField = false,
    },
    ref,
  ) {
    const isPageLayout = layout === "page"
    const isWrittenOff = initialData?.condition === "written_off"
    const isNeedsRepair = initialData?.condition === "needs_repair"
    const isBorrowed = initialData?.availability === "borrowed"
    const { t } = useTranslation()
    const readOnlyWarningMessage = isWrittenOff
      ? t("inventory.detail.readOnlyWrittenOffWarning")
      : isNeedsRepair
        ? t("inventory.detail.readOnlyNeedsRepairWarning")
        : isBorrowed
          ? t("inventory.detail.readOnlyBorrowedWarning")
          : t("inventory.detail.readOnlyWrittenOffWarning")
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
    const { data: lookups, isLoading: lookupsLoading } = useInventoryReferenceLookupsQuery()
    const lookupCategories = lookups?.categories ?? []
    const lookupSubcategories = lookups?.subcategories ?? []
    const lookupLocations = lookups?.locations ?? []
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
    const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false)
    const [createLocationOpen, setCreateLocationOpen] = useState(false)
    const [categorySelectOpen, setCategorySelectOpen] = useState(false)
    const [subcategorySelectOpen, setSubcategorySelectOpen] = useState(false)
    const [locationSelectOpen, setLocationSelectOpen] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)

    useEffect(() => {
      onBusyChange?.(isCompressing)
    }, [isCompressing, onBusyChange])
    const previousCategoryIdRef = useRef<string | null>(null)
    const pendingCategoryIdRef = useRef<string | null>(null)
    const pendingSubcategoryIdRef = useRef<string | null>(null)
    const pendingLocationIdRef = useRef<string | null>(null)
    const formRef = useRef<HTMLFormElement | null>(null)

    const schema = useMemo(
      () =>
        z.object({
          name: z
            .string()
            .trim()
            .min(1, t("inventory.form.validation.nameRequired"))
            .max(
              INVENTORY_FIELD_LIMITS.name,
              t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.name }),
            ),
          categoryId: z.string().min(1, t("inventory.form.validation.categoryRequired")),
          subcategoryId: z.string().min(1, t("inventory.form.validation.subcategoryRequired")),
          quantity: z.preprocess(
            (value) => {
              if (value === "" || value === null || value === undefined) {
                return undefined
              }
              const parsed = typeof value === "number" ? value : Number(value)
              return Number.isFinite(parsed) ? parsed : undefined
            },
            z
              .number({ error: t("inventory.form.validation.quantityRequired") })
              .int(t("inventory.form.validation.quantityInteger"))
              .min(INVENTORY_FIELD_LIMITS.quantityMin, t("inventory.form.validation.quantityMin"))
              .max(
                INVENTORY_FIELD_LIMITS.quantityMax,
                t("inventory.form.validation.quantityMax", {
                  max: INVENTORY_FIELD_LIMITS.quantityMax,
                }),
              ),
          ),
          locationId: z.string().min(1, t("inventory.form.validation.locationRequired")),
          availability: z.literal("in_church"),
          availabilityComment: z
            .string()
            .max(
              INVENTORY_FIELD_LIMITS.availabilityComment,
              t("inventory.form.validation.stringMax", {
                max: INVENTORY_FIELD_LIMITS.availabilityComment,
              }),
            )
            .optional()
            .default(""),
          supplier: z
            .string()
            .max(
              INVENTORY_FIELD_LIMITS.supplier,
              t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.supplier }),
            )
            .optional()
            .default(""),
          price: z.preprocess(
            (value) => {
              if (value === "" || value === null || value === undefined) {
                return null
              }
              if (typeof value === "number" && Number.isNaN(value)) {
                return null
              }
              const parsed = typeof value === "number" ? value : Number(value)
              return Number.isFinite(parsed) ? parsed : null
            },
            z
              .number()
              .min(INVENTORY_FIELD_LIMITS.priceMin, t("inventory.form.validation.priceMin"))
              .max(
                INVENTORY_FIELD_LIMITS.priceMax,
                t("inventory.form.validation.priceMax", { max: INVENTORY_FIELD_LIMITS.priceMax }),
              )
              .nullable(),
          ),
          serialNumber: z
            .string()
            .max(
              INVENTORY_FIELD_LIMITS.serialNumber,
              t("inventory.form.validation.stringMax", {
                max: INVENTORY_FIELD_LIMITS.serialNumber,
              }),
            )
            .optional()
            .default(""),
          warrantyUntil: z.string().nullable().optional(),
          comment: z
            .string()
            .max(
              INVENTORY_FIELD_LIMITS.comment,
              t("inventory.form.validation.stringMax", { max: INVENTORY_FIELD_LIMITS.comment }),
            )
            .optional()
            .default(""),
          photos: z
            .array(
              z.object({
                id: z.string(),
                dataUrl: z.string(),
              }),
            )
            .optional()
            .default([]),
          avatarPhotoId: z.string().nullable().optional().default(null),
        }),
      [t],
    )

    type FormValues = z.infer<typeof schema>

    const initialDataKey = initialData ? `${initialData.id}:${initialData.updatedAt}` : "create"

    // Recreate only when the persisted item revision changes (or create form mounts).
    // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by initialDataKey
    const defaultValues = useMemo(
      () => ({
        name: initialData?.name ?? "",
        categoryId: initialData?.categoryId ?? "",
        subcategoryId: initialData?.subcategoryId ?? "",
        quantity: initialData?.quantity ?? 1,
        locationId: initialData?.locationId ?? "",
        availability: "in_church" as const,
        availabilityComment: "",
        supplier: initialData?.supplier ?? "",
        price: initialData?.price ?? null,
        serialNumber: initialData?.serialNumber ?? "",
        warrantyUntil: toDateInputValue(initialData?.warrantyUntil),
        comment: initialData?.comment ?? "",
        photos: initialData?.photos ? [...initialData.photos] : [],
        avatarPhotoId: initialData?.avatarPhotoId ?? null,
      }),
      [initialDataKey],
    )

    const {
      control,
      register,
      handleSubmit,
      watch,
      setValue,
      reset,
      clearErrors,
      trigger,
      formState: { errors, isDirty },
    } = useForm({
      resolver: zodResolver(schema),
      defaultValues,
      mode: "onSubmit",
      reValidateMode: "onChange",
    })

    const { ref: nameFieldRef, ...nameFieldRegister } = register("name")

    useEffect(() => {
      if (!autoFocusFirstField || readOnly) {
        return
      }
      const frame = requestAnimationFrame(() => {
        document.getElementById("inventory-item-name")?.focus({ preventScroll: true })
      })
      return () => cancelAnimationFrame(frame)
    }, [autoFocusFirstField, readOnly])

    // Keep defaults in sync and clear false dirty state after mount/effects.
    useEffect(() => {
      previousCategoryIdRef.current = defaultValues.categoryId
      reset(defaultValues)
    }, [defaultValues, reset])

    useEffect(() => {
      onDirtyChange?.(isDirty)
    }, [isDirty, onDirtyChange])

    const categoryId = watch("categoryId")
    const subcategoryId = watch("subcategoryId")
    const locationId = watch("locationId")
    const photos = watch("photos") ?? []
    const avatarPhotoId = watch("avatarPhotoId")

    const categoryOptions = useMemo(
      () => optionsWithCurrent(categories, lookupCategories, categoryId),
      [categories, categoryId, lookupCategories],
    )
    const filteredSubcategories = useMemo(() => {
      const visible = subcategories.filter((subcategory) => subcategory.categoryId === categoryId)
      const lookupForCategory = lookupSubcategories.filter(
        (subcategory) => subcategory.categoryId === categoryId,
      )
      return optionsWithCurrent(visible, lookupForCategory, subcategoryId)
    }, [categoryId, lookupSubcategories, subcategoryId, subcategories])
    const locationOptions = useMemo(
      () => optionsWithCurrent(locations, lookupLocations, locationId),
      [locationId, locations, lookupLocations],
    )

    // Reset subcategory only when the user actually changes category.
    useEffect(() => {
      if (previousCategoryIdRef.current === null) {
        previousCategoryIdRef.current = categoryId
        return
      }
      if (previousCategoryIdRef.current === categoryId) {
        return
      }
      previousCategoryIdRef.current = categoryId
      // Do not validate here — empty subcategory errors only after Save.
      setValue("subcategoryId", "", { shouldDirty: true, shouldValidate: false })
      clearErrors("subcategoryId")
    }, [categoryId, clearErrors, setValue])

    // Select newly created category once it is in the options list.
    useEffect(() => {
      const pendingId = pendingCategoryIdRef.current
      if (!pendingId || !categories.some((category) => category.id === pendingId)) {
        return
      }
      pendingCategoryIdRef.current = null
      setValue("categoryId", pendingId, { shouldDirty: true, shouldValidate: false })
      setValue("subcategoryId", "", { shouldDirty: true, shouldValidate: false })
      clearErrors(["categoryId", "subcategoryId"])
      setCategorySelectOpen(false)
    }, [categories, clearErrors, setValue])

    // Select newly created subcategory once it is in the options list.
    useEffect(() => {
      const pendingId = pendingSubcategoryIdRef.current
      if (!pendingId || !subcategories.some((subcategory) => subcategory.id === pendingId)) {
        return
      }
      pendingSubcategoryIdRef.current = null
      setValue("subcategoryId", pendingId, { shouldDirty: true, shouldValidate: true })
      setSubcategorySelectOpen(false)
    }, [subcategories, setValue])

    // Select newly created location once it is in the options list.
    useEffect(() => {
      const pendingId = pendingLocationIdRef.current
      if (!pendingId || !locations.some((location) => location.id === pendingId)) {
        return
      }
      pendingLocationIdRef.current = null
      setValue("locationId", pendingId, { shouldDirty: true, shouldValidate: true })
      setLocationSelectOpen(false)
    }, [locations, setValue])

    // If selected category no longer exists at all, clear both selects.
    // Soft-deleted categories stay as the current value via lookups.
    useEffect(() => {
      if (categoriesLoading || lookupsLoading || pendingCategoryIdRef.current) {
        return
      }
      if (categoryId && !lookupCategories.some((category) => category.id === categoryId)) {
        setValue("categoryId", "", { shouldValidate: false })
        setValue("subcategoryId", "", { shouldValidate: false })
        clearErrors(["categoryId", "subcategoryId"])
      }
    }, [categoriesLoading, categoryId, clearErrors, lookupCategories, lookupsLoading, setValue])

    const scrollToFirstError = () => {
      // Wait for error messages to paint before scrolling.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const target = formRef.current?.querySelector<HTMLElement>("[data-field-error]")
          target?.scrollIntoView({ behavior: "smooth", block: "center" })
        })
      })
    }

    useImperativeHandle(ref, () => ({
      validate: async () => {
        const valid = await trigger()
        if (!valid) {
          onInvalid?.()
          scrollToFirstError()
        }
        return valid
      },
    }))

    const submitForm = handleSubmit(
      (values: FormValues) => {
        const payload: InventoryItemFormValues = {
          name: values.name.trim(),
          categoryId: values.categoryId,
          subcategoryId: values.subcategoryId,
          quantity: values.quantity,
          locationId: values.locationId,
          availability: "in_church",
          availabilityComment: "",
          supplier: values.supplier?.trim() ?? "",
          price: values.price ?? null,
          serialNumber: values.serialNumber?.trim() ?? "",
          warrantyUntil: values.warrantyUntil ? values.warrantyUntil : null,
          comment: values.comment?.trim() ?? "",
          photos: values.photos ?? [],
          avatarPhotoId: values.avatarPhotoId ?? null,
        }
        onSubmit(payload)
      },
      () => {
        onInvalid?.()
        scrollToFirstError()
      },
    )

    const onPhotosSelected = async (fileList: FileList | null) => {
      if (!fileList?.length) {
        return
      }
      setIsCompressing(true)
      try {
        const nextPhotos: InventoryPhoto[] = [...photos]
        for (const file of Array.from(fileList)) {
          const dataUrl = await compressImage(file)
          nextPhotos.push({ id: crypto.randomUUID(), dataUrl })
        }
        setValue("photos", nextPhotos, { shouldDirty: true })
        if (!avatarPhotoId && nextPhotos.length > 0) {
          setValue("avatarPhotoId", nextPhotos[0].id, { shouldDirty: true })
        }
      } catch (error) {
        console.error("[InventoryItemForm] Failed to compress image", error)
      } finally {
        setIsCompressing(false)
      }
    }

    const removePhoto = (photoId: string) => {
      const nextPhotos = photos.filter((photo) => photo.id !== photoId)
      setValue("photos", nextPhotos, { shouldDirty: true })
      if (avatarPhotoId === photoId) {
        setValue("avatarPhotoId", nextPhotos[0]?.id ?? null, { shouldDirty: true })
      }
    }

    return (
      <>
        <form
          ref={formRef}
          id={id}
          className={cn(
            isPageLayout
              ? "block"
              : "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
          )}
          onSubmit={(event) => void submitForm(event)}
        >
          {/* Scroll on a div — fieldset as flex/overflow container is unreliable in browsers. */}
          <div
            className={cn(
              "min-w-0 px-4 py-4",
              isPageLayout ? "space-y-4" : "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            )}
          >
            <fieldset
              disabled={readOnly}
              className="min-w-0 space-y-4 border-0 p-0 disabled:opacity-90"
            >
              {readOnly ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{readOnlyWarningMessage}</p>
                </div>
              ) : null}

              {categoriesError || subcategoriesError || locationsError ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                  <p className="text-destructive">{t("common.loadError")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void refetchCategories()
                      void refetchSubcategories()
                      void refetchLocations()
                    }}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="inventory-item-name">{t("inventory.form.name")} *</Label>
                <Input
                  id="inventory-item-name"
                  {...nameFieldRegister}
                  ref={nameFieldRef}
                  maxLength={INVENTORY_FIELD_LIMITS.name}
                  placeholder={t("inventory.form.namePlaceholder")}
                  disabled={readOnly}
                />
                {errors.name ? (
                  <p className="text-sm text-destructive" data-field-error>
                    {errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>{t("inventory.form.category")} *</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      open={categorySelectOpen}
                      onOpenChange={setCategorySelectOpen}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={readOnly || categoriesLoading}
                    >
                      <SelectTrigger aria-label={t("inventory.form.category")}>
                        <SelectValue
                          placeholder={
                            categoriesLoading
                              ? t("common.loading")
                              : t("inventory.form.categoryPlaceholder")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectCreateAction
                          label={t("inventory.form.createCategory")}
                          disabled={readOnly}
                          onCreate={() => {
                            setCategorySelectOpen(false)
                            setCreateCategoryOpen(true)
                          }}
                        />
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId ? (
                  <p className="text-sm text-destructive" data-field-error>
                    {errors.categoryId.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>{t("inventory.form.subcategory")} *</Label>
                <Controller
                  control={control}
                  name="subcategoryId"
                  render={({ field }) => {
                    const subcategoryDisabled = !categoryId || subcategoriesLoading
                    return (
                      <DisabledTooltip
                        disabled={!categoryId}
                        tip={t("inventory.subcategoryDisabledHint")}
                      >
                        <Select
                          open={subcategorySelectOpen}
                          onOpenChange={setSubcategorySelectOpen}
                          value={field.value || undefined}
                          disabled={subcategoryDisabled || readOnly}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            aria-label={t("inventory.form.subcategory")}
                            className={cn(!categoryId && "pointer-events-none")}
                          >
                            <SelectValue
                              placeholder={
                                subcategoriesLoading
                                  ? t("common.loading")
                                  : t("inventory.form.subcategoryPlaceholder")
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSubcategories.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={subcategory.id}>
                                {subcategory.name}
                              </SelectItem>
                            ))}
                            <SelectCreateAction
                              label={t("inventory.form.createSubcategory")}
                              disabled={!categoryId || readOnly}
                              onCreate={() => {
                                setSubcategorySelectOpen(false)
                                setCreateSubcategoryOpen(true)
                              }}
                            />
                          </SelectContent>
                        </Select>
                      </DisabledTooltip>
                    )
                  }}
                />
                {errors.subcategoryId ? (
                  <p className="text-sm text-destructive" data-field-error>
                    {errors.subcategoryId.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-item-quantity">{t("inventory.form.quantity")} *</Label>
                <Input
                  id="inventory-item-quantity"
                  type="number"
                  min={INVENTORY_FIELD_LIMITS.quantityMin}
                  max={INVENTORY_FIELD_LIMITS.quantityMax}
                  step={1}
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity ? (
                  <p className="text-sm text-destructive" data-field-error>
                    {errors.quantity.message}
                  </p>
                ) : null}
              </div>

              {isWrittenOff ? (
                <>
                  <div className="space-y-2">
                    <Label>{t("inventory.form.writeOffDate")}</Label>
                    <Input value={toDateInputValue(initialData?.writeOffDate)} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.form.writeOffReason")}</Label>
                    <Textarea
                      value={initialData?.writeOffReason ?? ""}
                      rows={4}
                      readOnly
                      disabled
                      className="min-h-0 resize-none"
                    />
                  </div>
                </>
              ) : null}

              {isNeedsRepair ? (
                <>
                  <div className="space-y-2">
                    <Label>{t("inventory.form.repairDate")}</Label>
                    <Input value={toDateInputValue(initialData?.repairDate)} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.form.repairComment")}</Label>
                    <Textarea
                      value={initialData?.repairComment ?? ""}
                      rows={4}
                      readOnly
                      disabled
                      className="min-h-0 resize-none"
                    />
                  </div>
                </>
              ) : null}

              {isBorrowed ? (
                <>
                  <div className="space-y-2">
                    <Label>{t("inventory.form.borrowDate")}</Label>
                    <Input value={toDateInputValue(initialData?.borrowDate)} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("inventory.form.availabilityComment")}</Label>
                    <Textarea
                      value={initialData?.availabilityComment ?? ""}
                      rows={4}
                      readOnly
                      disabled
                      className="min-h-0 resize-none"
                    />
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label>{t("inventory.form.location")} *</Label>
                <Controller
                  control={control}
                  name="locationId"
                  render={({ field }) => (
                    <Select
                      open={locationSelectOpen}
                      onOpenChange={setLocationSelectOpen}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={readOnly || locationsLoading}
                    >
                      <SelectTrigger aria-label={t("inventory.form.location")}>
                        <SelectValue
                          placeholder={
                            locationsLoading
                              ? t("common.loading")
                              : t("inventory.form.locationPlaceholder")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                        <SelectCreateAction
                          label={t("inventory.form.createLocation")}
                          disabled={readOnly}
                          onCreate={() => {
                            setLocationSelectOpen(false)
                            setCreateLocationOpen(true)
                          }}
                        />
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.locationId ? (
                  <p className="text-sm text-destructive" data-field-error>
                    {errors.locationId.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-item-supplier">{t("inventory.form.supplier")}</Label>
                <Input
                  id="inventory-item-supplier"
                  {...register("supplier")}
                  maxLength={INVENTORY_FIELD_LIMITS.supplier}
                  placeholder={t("inventory.form.supplierPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-item-price">{t("inventory.form.price")}</Label>
                <Input
                  id="inventory-item-price"
                  type="number"
                  step="0.01"
                  min={INVENTORY_FIELD_LIMITS.priceMin}
                  max={INVENTORY_FIELD_LIMITS.priceMax}
                  {...register("price")}
                  placeholder={t("inventory.form.pricePlaceholder")}
                />
                {errors.price ? (
                  <p className="text-sm text-destructive" data-field-error>
                    {errors.price.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-item-serial">{t("inventory.form.serialNumber")}</Label>
                <Input
                  id="inventory-item-serial"
                  {...register("serialNumber")}
                  maxLength={INVENTORY_FIELD_LIMITS.serialNumber}
                  placeholder={t("inventory.form.serialNumberPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-item-warranty">{t("inventory.form.warrantyUntil")}</Label>
                <Input
                  id="inventory-item-warranty"
                  type="date"
                  aria-label={t("inventory.form.warrantyUntil")}
                  disabled={readOnly}
                  {...register("warrantyUntil", {
                    setValueAs: (value) => (value === "" ? null : value),
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-item-comment">{t("inventory.form.comment")}</Label>
                <Textarea
                  id="inventory-item-comment"
                  {...register("comment")}
                  rows={4}
                  maxLength={INVENTORY_FIELD_LIMITS.comment}
                  placeholder={t("inventory.form.commentPlaceholder")}
                  className="min-h-0 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-item-photos">{t("inventory.form.photos")}</Label>
                <Input
                  id="inventory-item-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isCompressing || readOnly}
                  onChange={(event) => {
                    void onPhotosSelected(event.target.files)
                    event.target.value = ""
                  }}
                />
                {isCompressing ? (
                  <p className="text-sm text-muted-foreground">
                    {t("inventory.form.photosCompressing")}
                  </p>
                ) : null}
                {photos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {photos.map((photo) => {
                      const isAvatar = avatarPhotoId === photo.id
                      return (
                        <div
                          key={photo.id}
                          className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                        >
                          <img
                            src={photo.dataUrl}
                            alt=""
                            className="size-full object-cover"
                            draggable={false}
                          />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 p-1">
                            <button
                              type="button"
                              className={cn(
                                "rounded p-0.5 text-white transition-colors",
                                isAvatar ? "text-amber-300" : "text-white/80 hover:text-amber-200",
                              )}
                              aria-label={t("inventory.form.setAvatar")}
                              aria-pressed={isAvatar}
                              onClick={() =>
                                setValue("avatarPhotoId", photo.id, { shouldDirty: true })
                              }
                            >
                              <Star
                                className="size-3.5"
                                fill={isAvatar ? "currentColor" : "none"}
                                aria-hidden
                              />
                            </button>
                            <button
                              type="button"
                              className="rounded p-0.5 text-white/80 transition-colors hover:text-white"
                              aria-label={t("inventory.form.removePhoto")}
                              onClick={() => removePhoto(photo.id)}
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
              {isPageLayout ? null : (
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&>:last-child]:mt-4 sm:[&>:last-child]:mt-0">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    {t("inventory.actions.cancel")}
                  </Button>
                  {readOnly ? null : (
                    <Button type="submit" disabled={isCompressing}>
                      {submitLabel ?? t("inventory.form.save")}
                    </Button>
                  )}
                </div>
              )}
            </fieldset>
          </div>
        </form>

        <CreateReferenceEntityDialog<Category>
          open={createCategoryOpen}
          onOpenChange={setCreateCategoryOpen}
          onCreated={(category) => {
            pendingCategoryIdRef.current = category.id
            setValue("categoryId", category.id, { shouldDirty: true, shouldValidate: false })
            setValue("subcategoryId", "", { shouldDirty: true, shouldValidate: false })
            clearErrors(["categoryId", "subcategoryId"])
            setCategorySelectOpen(false)
          }}
          titleKey="inventory.form.createCategoryTitle"
          labelKey="inventory.form.categoryName"
          placeholderKey="inventory.form.categoryNamePlaceholder"
          validationRequiredKey="inventory.form.validation.categoryNameRequired"
          inputIdPrefix="create-category-name"
          createMutationHook={useCreateCategoryMutation}
        />

        <CreateSubcategoryDialog
          open={createSubcategoryOpen}
          categoryId={categoryId}
          categoryName={
            lookupCategories.find((category) => category.id === categoryId)?.name ??
            categories.find((category) => category.id === categoryId)?.name ??
            ""
          }
          onOpenChange={setCreateSubcategoryOpen}
          onCreated={(subcategory) => {
            pendingSubcategoryIdRef.current = subcategory.id
            setValue("subcategoryId", subcategory.id, { shouldDirty: true, shouldValidate: true })
            setSubcategorySelectOpen(false)
          }}
        />

        <CreateReferenceEntityDialog<Location>
          open={createLocationOpen}
          onOpenChange={setCreateLocationOpen}
          onCreated={(location) => {
            pendingLocationIdRef.current = location.id
            setValue("locationId", location.id, { shouldDirty: true, shouldValidate: true })
            setLocationSelectOpen(false)
          }}
          titleKey="inventory.form.createLocationTitle"
          labelKey="inventory.form.locationName"
          placeholderKey="inventory.form.locationNamePlaceholder"
          validationRequiredKey="inventory.form.validation.locationNameRequired"
          inputIdPrefix="create-location-name"
          createMutationHook={useCreateLocationMutation}
        />
      </>
    )
  },
)

InventoryItemForm.displayName = "InventoryItemForm"
