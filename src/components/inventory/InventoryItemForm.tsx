import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Plus, Star, X } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { z } from "zod"

import { CreateReferenceEntityDialog } from "@/components/inventory/CreateReferenceEntityDialog"
import { CreateSubcategoryDialog } from "@/components/inventory/CreateSubcategoryDialog"
import { Button } from "@/components/ui/button"
import { toDateInputValue as formatDateForStorage } from "@/components/ui/date-picker"
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
  useCreateResponsibleMutation,
  useInventoryReferenceLookupsQuery,
  useLocationsQuery,
  useResponsiblesQuery,
  useSubcategoriesQuery,
} from "@/hooks/queries/useInventoryQueries"
import { dayAfter, isReturnDateAfterBorrowDate } from "@/lib/borrowDates"
import { INVENTORY_FIELD_LIMITS } from "@/lib/inventoryFieldLimits"
import { optionsWithCurrent } from "@/lib/inventoryReferenceOptions"
import { compressImage } from "@/lib/inventoryStorage"
import { sortByName } from "@/lib/localeCompare"
import { cn } from "@/lib/utils"
import type {
  Category,
  CreateInventoryItemInput,
  InventoryItem,
  InventoryPhoto,
  Location,
  Responsible,
} from "@/types/inventory"

export type InventoryItemFormValues = CreateInventoryItemInput & {
  writeOffDate?: string | null
  writeOffReason?: string | null
  repairDate?: string | null
  repairComment?: string | null
  borrowDate?: string | null
  returnDate?: string | null
}

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
  /** Locks regular fields on written-off / repair / borrowed items. Status date and comment stay editable. */
  readOnly?: boolean
  /** Visible original item this split was created from. Hidden when the original is removed. */
  originalItem?: InventoryItem
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
      originalItem,
      autoFocusFirstField = false,
    },
    ref,
  ) {
    const isPageLayout = layout === "page"
    const isWrittenOff = initialData?.condition === "written_off"
    const isNeedsRepair = initialData?.condition === "needs_repair"
    const isBorrowed = initialData?.availability === "borrowed"
    const { t, i18n } = useTranslation()
    const todayDateValue = formatDateForStorage(new Date())
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
    const {
      data: responsibles = [],
      isLoading: responsiblesLoading,
      isError: responsiblesError,
      refetch: refetchResponsibles,
    } = useResponsiblesQuery()
    const { data: lookups, isLoading: lookupsLoading } = useInventoryReferenceLookupsQuery()
    const lookupCategories = lookups?.categories ?? []
    const lookupSubcategories = lookups?.subcategories ?? []
    const lookupLocations = lookups?.locations ?? []
    const lookupResponsibles = lookups?.responsibles ?? []
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
    const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false)
    const [createLocationOpen, setCreateLocationOpen] = useState(false)
    const [createResponsibleOpen, setCreateResponsibleOpen] = useState(false)
    const [categorySelectOpen, setCategorySelectOpen] = useState(false)
    const [subcategorySelectOpen, setSubcategorySelectOpen] = useState(false)
    const [locationSelectOpen, setLocationSelectOpen] = useState(false)
    const [responsibleSelectOpen, setResponsibleSelectOpen] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)

    useEffect(() => {
      onBusyChange?.(isCompressing)
    }, [isCompressing, onBusyChange])
    const previousCategoryIdRef = useRef<string | null>(null)
    const pendingCategoryIdRef = useRef<string | null>(null)
    const pendingSubcategoryIdRef = useRef<string | null>(null)
    const pendingLocationIdRef = useRef<string | null>(null)
    const pendingResponsibleIdRef = useRef<string | null>(null)
    const formRef = useRef<HTMLFormElement | null>(null)

    const schema = useMemo(
      () =>
        z
          .object({
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
            responsibleId: z.string().min(1, t("inventory.form.validation.responsibleRequired")),
            availability: z.literal("in_church"),
            availabilityComment: isBorrowed
              ? z
                  .string()
                  .trim()
                  .min(1, t("inventory.borrow.validation.commentRequired"))
                  .max(
                    INVENTORY_FIELD_LIMITS.availabilityComment,
                    t("inventory.form.validation.stringMax", {
                      max: INVENTORY_FIELD_LIMITS.availabilityComment,
                    }),
                  )
              : z
                  .string()
                  .max(
                    INVENTORY_FIELD_LIMITS.availabilityComment,
                    t("inventory.form.validation.stringMax", {
                      max: INVENTORY_FIELD_LIMITS.availabilityComment,
                    }),
                  )
                  .optional()
                  .default(""),
            borrowDate: isBorrowed
              ? z.string().min(1, t("inventory.borrow.validation.dateRequired"))
              : z.string().optional(),
            returnDate: isBorrowed
              ? z.string().min(1, t("inventory.borrow.validation.returnDateRequired"))
              : z.string().optional(),
            writeOffDate: isWrittenOff
              ? z.string().min(1, t("inventory.writeOff.validation.dateRequired"))
              : z.string().optional(),
            writeOffReason: isWrittenOff
              ? z
                  .string()
                  .trim()
                  .min(1, t("inventory.writeOff.validation.reasonRequired"))
                  .max(
                    INVENTORY_FIELD_LIMITS.writeOffReason,
                    t("inventory.form.validation.stringMax", {
                      max: INVENTORY_FIELD_LIMITS.writeOffReason,
                    }),
                  )
              : z.string().optional(),
            repairDate: isNeedsRepair
              ? z.string().min(1, t("inventory.needsRepair.validation.dateRequired"))
              : z.string().optional(),
            repairComment: isNeedsRepair
              ? z
                  .string()
                  .trim()
                  .min(1, t("inventory.needsRepair.validation.commentRequired"))
                  .max(
                    INVENTORY_FIELD_LIMITS.repairComment,
                    t("inventory.form.validation.stringMax", {
                      max: INVENTORY_FIELD_LIMITS.repairComment,
                    }),
                  )
              : z.string().optional(),
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
          })
          .superRefine((values, ctx) => {
            if (!isBorrowed || !values.borrowDate || !values.returnDate) {
              return
            }
            if (!isReturnDateAfterBorrowDate(values.borrowDate, values.returnDate)) {
              ctx.addIssue({
                code: "custom",
                path: ["returnDate"],
                message: t("inventory.borrow.validation.returnDateAfterBorrow"),
              })
            }
          }),
      [isBorrowed, isNeedsRepair, isWrittenOff, t],
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
        quantity: initialData?.quantity ?? "",
        locationId: initialData?.locationId ?? "",
        responsibleId: initialData?.responsibleId ?? "",
        availability: "in_church" as const,
        availabilityComment: initialData?.availabilityComment ?? "",
        borrowDate: toDateInputValue(initialData?.borrowDate),
        returnDate: toDateInputValue(initialData?.returnDate),
        writeOffDate: toDateInputValue(initialData?.writeOffDate),
        writeOffReason: initialData?.writeOffReason ?? "",
        repairDate: toDateInputValue(initialData?.repairDate),
        repairComment: initialData?.repairComment ?? "",
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
      if (!autoFocusFirstField) {
        return
      }
      const fieldId = isWrittenOff
        ? "inventory-item-write-off-date"
        : isNeedsRepair
          ? "inventory-item-repair-date"
          : isBorrowed
            ? "inventory-item-borrow-date"
            : readOnly
              ? null
              : "inventory-item-name"
      if (!fieldId) {
        return
      }
      const frame = requestAnimationFrame(() => {
        document.getElementById(fieldId)?.focus({ preventScroll: true })
      })
      return () => cancelAnimationFrame(frame)
    }, [autoFocusFirstField, isBorrowed, isNeedsRepair, isWrittenOff, readOnly])

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
    const responsibleId = watch("responsibleId")
    const photos = watch("photos") ?? []
    const avatarPhotoId = watch("avatarPhotoId")
    const borrowDateValue = watch("borrowDate")
    const returnDateMin = borrowDateValue ? dayAfter(borrowDateValue) : undefined

    const categoryOptions = useMemo(
      () => sortByName(optionsWithCurrent(categories, lookupCategories, categoryId), i18n.language),
      [categories, categoryId, i18n.language, lookupCategories],
    )
    const filteredSubcategories = useMemo(() => {
      const visible = subcategories.filter((subcategory) => subcategory.categoryId === categoryId)
      const lookupForCategory = lookupSubcategories.filter(
        (subcategory) => subcategory.categoryId === categoryId,
      )
      return sortByName(
        optionsWithCurrent(visible, lookupForCategory, subcategoryId),
        i18n.language,
      )
    }, [categoryId, i18n.language, lookupSubcategories, subcategoryId, subcategories])
    const locationOptions = useMemo(
      () => sortByName(optionsWithCurrent(locations, lookupLocations, locationId), i18n.language),
      [i18n.language, locationId, locations, lookupLocations],
    )
    const responsibleOptions = useMemo(
      () =>
        sortByName(
          optionsWithCurrent(responsibles, lookupResponsibles, responsibleId),
          i18n.language,
        ),
      [i18n.language, lookupResponsibles, responsibleId, responsibles],
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

    // Select newly created responsible once it is in the options list.
    useEffect(() => {
      const pendingId = pendingResponsibleIdRef.current
      if (!pendingId || !responsibles.some((responsible) => responsible.id === pendingId)) {
        return
      }
      pendingResponsibleIdRef.current = null
      setValue("responsibleId", pendingId, { shouldDirty: true, shouldValidate: true })
      setResponsibleSelectOpen(false)
    }, [responsibles, setValue])

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
          responsibleId: values.responsibleId,
          availability: "in_church",
          availabilityComment: isBorrowed ? (values.availabilityComment?.trim() ?? "") : "",
          supplier: values.supplier?.trim() ?? "",
          price: values.price ?? null,
          serialNumber: values.serialNumber?.trim() ?? "",
          warrantyUntil: values.warrantyUntil ? values.warrantyUntil : null,
          comment: values.comment?.trim() ?? "",
          photos: values.photos ?? [],
          avatarPhotoId: values.avatarPhotoId ?? null,
          ...(isWrittenOff
            ? {
                writeOffDate: values.writeOffDate || null,
                writeOffReason: values.writeOffReason?.trim() ?? "",
              }
            : {}),
          ...(isNeedsRepair
            ? {
                repairDate: values.repairDate || null,
                repairComment: values.repairComment?.trim() ?? "",
              }
            : {}),
          ...(isBorrowed
            ? {
                borrowDate: values.borrowDate || null,
                returnDate: values.returnDate || null,
              }
            : {}),
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
          noValidate
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
            <fieldset className="min-w-0 space-y-4 border-0 p-0">
              {originalItem ? (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p>
                    {t("inventory.detail.originalItemHint")}{" "}
                    <Link
                      to={`/inventory/${originalItem.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {t("inventory.detail.originalItemLink", { name: originalItem.name })}
                    </Link>
                  </p>
                </div>
              ) : null}
              {readOnly ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{readOnlyWarningMessage}</p>
                </div>
              ) : null}

              {categoriesError || subcategoriesError || locationsError || responsiblesError ? (
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
                      void refetchResponsibles()
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
                  disabled={readOnly}
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
                    <Label htmlFor="inventory-item-write-off-date">
                      {t("inventory.form.writeOffDate")} *
                    </Label>
                    <Input
                      id="inventory-item-write-off-date"
                      type="date"
                      aria-label={t("inventory.form.writeOffDate")}
                      max={todayDateValue}
                      {...register("writeOffDate")}
                    />
                    {errors.writeOffDate ? (
                      <p className="text-sm text-destructive" data-field-error>
                        {errors.writeOffDate.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventory-item-write-off-reason">
                      {t("inventory.form.writeOffReason")} *
                    </Label>
                    <Textarea
                      id="inventory-item-write-off-reason"
                      rows={4}
                      maxLength={INVENTORY_FIELD_LIMITS.writeOffReason}
                      {...register("writeOffReason")}
                      className="min-h-0 resize-none"
                    />
                    {errors.writeOffReason ? (
                      <p className="text-sm text-destructive" data-field-error>
                        {errors.writeOffReason.message}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {isNeedsRepair ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="inventory-item-repair-date">
                      {t("inventory.form.repairDate")} *
                    </Label>
                    <Input
                      id="inventory-item-repair-date"
                      type="date"
                      aria-label={t("inventory.form.repairDate")}
                      max={todayDateValue}
                      {...register("repairDate")}
                    />
                    {errors.repairDate ? (
                      <p className="text-sm text-destructive" data-field-error>
                        {errors.repairDate.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventory-item-repair-comment">
                      {t("inventory.form.repairComment")} *
                    </Label>
                    <Textarea
                      id="inventory-item-repair-comment"
                      rows={4}
                      maxLength={INVENTORY_FIELD_LIMITS.repairComment}
                      {...register("repairComment")}
                      className="min-h-0 resize-none"
                    />
                    {errors.repairComment ? (
                      <p className="text-sm text-destructive" data-field-error>
                        {errors.repairComment.message}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {isBorrowed ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="inventory-item-borrow-date">
                      {t("inventory.form.borrowDate")} *
                    </Label>
                    <Input
                      id="inventory-item-borrow-date"
                      type="date"
                      aria-label={t("inventory.form.borrowDate")}
                      max={todayDateValue}
                      {...register("borrowDate")}
                    />
                    {errors.borrowDate ? (
                      <p className="text-sm text-destructive" data-field-error>
                        {errors.borrowDate.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventory-item-return-date">
                      {t("inventory.form.returnDate")} *
                    </Label>
                    <Input
                      id="inventory-item-return-date"
                      type="date"
                      aria-label={t("inventory.form.returnDate")}
                      min={returnDateMin}
                      {...register("returnDate")}
                    />
                    {errors.returnDate ? (
                      <p className="text-sm text-destructive" data-field-error>
                        {errors.returnDate.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventory-item-availability-comment">
                      {t("inventory.form.availabilityComment")} *
                    </Label>
                    <Textarea
                      id="inventory-item-availability-comment"
                      rows={4}
                      maxLength={INVENTORY_FIELD_LIMITS.availabilityComment}
                      {...register("availabilityComment")}
                      className="min-h-0 resize-none"
                    />
                    {errors.availabilityComment ? (
                      <p className="text-sm text-destructive" data-field-error>
                        {errors.availabilityComment.message}
                      </p>
                    ) : null}
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
                <Label>{t("inventory.form.responsible")} *</Label>
                <Controller
                  control={control}
                  name="responsibleId"
                  render={({ field }) => (
                    <Select
                      open={responsibleSelectOpen}
                      onOpenChange={setResponsibleSelectOpen}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={readOnly || responsiblesLoading}
                    >
                      <SelectTrigger aria-label={t("inventory.form.responsible")}>
                        <SelectValue
                          placeholder={
                            responsiblesLoading
                              ? t("common.loading")
                              : t("inventory.form.responsiblePlaceholder")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {responsibleOptions.map((responsible) => (
                          <SelectItem key={responsible.id} value={responsible.id}>
                            {responsible.name}
                          </SelectItem>
                        ))}
                        <SelectCreateAction
                          label={t("inventory.form.createResponsible")}
                          disabled={readOnly}
                          onCreate={() => {
                            setResponsibleSelectOpen(false)
                            setCreateResponsibleOpen(true)
                          }}
                        />
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.responsibleId ? (
                  <p className="text-sm text-destructive" data-field-error>
                    {errors.responsibleId.message}
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
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                              disabled={readOnly}
                              className={cn(
                                "rounded p-0.5 text-white transition-colors",
                                isAvatar ? "text-amber-300" : "text-white/80 hover:text-amber-200",
                                readOnly && "pointer-events-none opacity-50",
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
                              disabled={readOnly}
                              className={cn(
                                "rounded p-0.5 text-white/80 transition-colors hover:text-white",
                                readOnly && "pointer-events-none opacity-50",
                              )}
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

        <CreateReferenceEntityDialog<Responsible>
          open={createResponsibleOpen}
          onOpenChange={setCreateResponsibleOpen}
          onCreated={(responsible) => {
            pendingResponsibleIdRef.current = responsible.id
            setValue("responsibleId", responsible.id, { shouldDirty: true, shouldValidate: true })
            setResponsibleSelectOpen(false)
          }}
          titleKey="inventory.form.createResponsibleTitle"
          labelKey="inventory.form.responsibleName"
          placeholderKey="inventory.form.responsibleNamePlaceholder"
          validationRequiredKey="inventory.form.validation.responsibleNameRequired"
          inputIdPrefix="create-responsible-name"
          createMutationHook={useCreateResponsibleMutation}
        />
      </>
    )
  },
)

InventoryItemForm.displayName = "InventoryItemForm"
