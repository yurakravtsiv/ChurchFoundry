import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Star, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { CreateCategoryDialog } from "@/components/inventory/CreateCategoryDialog"
import { CreateLocationDialog } from "@/components/inventory/CreateLocationDialog"
import { CreateSubcategoryDialog } from "@/components/inventory/CreateSubcategoryDialog"
import { Button } from "@/components/ui/button"
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
  compressImage,
  getCategories,
  getLocations,
  getSubcategories,
} from "@/lib/inventoryStorage"
import { cn } from "@/lib/utils"
import type { CreateInventoryItemInput, InventoryItem, InventoryPhoto } from "@/types/inventory"

export type InventoryItemFormValues = CreateInventoryItemInput

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

export function InventoryItemForm({
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
}: InventoryItemFormProps) {
  const isPageLayout = layout === "page"
  const { t } = useTranslation()
  const [categories, setCategories] = useState(() => getCategories())
  const [subcategories, setSubcategories] = useState(() => getSubcategories())
  const [locations, setLocations] = useState(() => getLocations())
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

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(1, t("inventory.form.validation.nameRequired")),
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
              .min(1, t("inventory.form.validation.quantityMin")),
          ),
          locationId: z.string().min(1, t("inventory.form.validation.locationRequired")),
          availability: z.enum(["in_church", "borrowed"]),
          availabilityComment: z.string().optional().default(""),
          supplier: z.string().optional().default(""),
          price: z.preprocess((value) => {
            if (value === "" || value === null || value === undefined) {
              return null
            }
            if (typeof value === "number" && Number.isNaN(value)) {
              return null
            }
            const parsed = typeof value === "number" ? value : Number(value)
            return Number.isFinite(parsed) ? parsed : null
          }, z.number().min(0, t("inventory.form.validation.priceMin")).nullable()),
          serialNumber: z.string().optional().default(""),
          warrantyUntil: z.string().nullable().optional(),
          comment: z.string().optional().default(""),
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
        .superRefine((data, ctx) => {
          if (data.availability === "borrowed" && !data.availabilityComment.trim()) {
            ctx.addIssue({
              code: "custom",
              path: ["availabilityComment"],
              message: t("inventory.form.validation.availabilityCommentRequired"),
            })
          }
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
      availability: initialData?.availability ?? ("in_church" as const),
      availabilityComment: initialData?.availabilityComment ?? "",
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
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // Keep defaults in sync and clear false dirty state after mount/effects.
  useEffect(() => {
    previousCategoryIdRef.current = defaultValues.categoryId
    reset(defaultValues)
  }, [defaultValues, reset])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const categoryId = watch("categoryId")
  const availability = watch("availability")
  const photos = watch("photos") ?? []
  const avatarPhotoId = watch("avatarPhotoId")

  const filteredSubcategories = useMemo(
    () => subcategories.filter((subcategory) => subcategory.categoryId === categoryId),
    [categoryId, subcategories],
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
    setValue("subcategoryId", "", { shouldDirty: true, shouldValidate: true })
  }, [categoryId, setValue])

  // Select newly created category once it is in the options list.
  useEffect(() => {
    const pendingId = pendingCategoryIdRef.current
    if (!pendingId || !categories.some((category) => category.id === pendingId)) {
      return
    }
    pendingCategoryIdRef.current = null
    setValue("categoryId", pendingId, { shouldDirty: true, shouldValidate: true })
    setValue("subcategoryId", "", { shouldDirty: true })
    setCategorySelectOpen(false)
  }, [categories, setValue])

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

  // If selected category no longer exists, clear both selects.
  useEffect(() => {
    if (pendingCategoryIdRef.current) {
      return
    }
    if (categoryId && !categories.some((category) => category.id === categoryId)) {
      setValue("categoryId", "")
      setValue("subcategoryId", "")
    }
  }, [categories, categoryId, setValue])

  const submitForm = handleSubmit(
    (values: FormValues) => {
      const payload: InventoryItemFormValues = {
        name: values.name.trim(),
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId,
        quantity: values.quantity,
        locationId: values.locationId,
        availability: values.availability,
        availabilityComment:
          values.availability === "borrowed" ? (values.availabilityComment?.trim() ?? "") : "",
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
        id={id}
        className={cn(isPageLayout ? "block" : "flex min-h-0 flex-1 flex-col")}
        onSubmit={(event) => void submitForm(event)}
      >
        <div
          className={cn("space-y-4 px-6 py-4", !isPageLayout && "min-h-0 flex-1 overflow-y-auto")}
        >
          <div className="space-y-2">
            <Label htmlFor="inventory-item-name">{t("inventory.form.name")} *</Label>
            <Input
              id="inventory-item-name"
              {...register("name")}
              placeholder={t("inventory.form.namePlaceholder")}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
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
                >
                  <SelectTrigger aria-label={t("inventory.form.category")}>
                    <SelectValue placeholder={t("inventory.form.categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectCreateAction
                      label={t("inventory.form.createCategory")}
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
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{t("inventory.form.subcategory")} *</Label>
            <Controller
              control={control}
              name="subcategoryId"
              render={({ field }) => (
                <Select
                  open={subcategorySelectOpen}
                  onOpenChange={setSubcategorySelectOpen}
                  value={field.value || undefined}
                  disabled={!categoryId}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger aria-label={t("inventory.form.subcategory")}>
                    <SelectValue placeholder={t("inventory.form.subcategoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                    <SelectCreateAction
                      label={t("inventory.form.createSubcategory")}
                      disabled={!categoryId}
                      onCreate={() => {
                        setSubcategorySelectOpen(false)
                        setCreateSubcategoryOpen(true)
                      }}
                    />
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subcategoryId ? (
              <p className="text-sm text-destructive">{errors.subcategoryId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory-item-quantity">{t("inventory.form.quantity")} *</Label>
            <Input
              id="inventory-item-quantity"
              type="number"
              min={1}
              step={1}
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity ? (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            ) : null}
          </div>

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
                >
                  <SelectTrigger aria-label={t("inventory.form.location")}>
                    <SelectValue placeholder={t("inventory.form.locationPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                    <SelectCreateAction
                      label={t("inventory.form.createLocation")}
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
              <p className="text-sm text-destructive">{errors.locationId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{t("inventory.form.availability")} *</Label>
            <Controller
              control={control}
              name="availability"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label={t("inventory.form.availability")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_church">
                      {t("inventory.availability.inChurch")}
                    </SelectItem>
                    <SelectItem value="borrowed">{t("inventory.availability.borrowed")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
              availability === "borrowed"
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 pb-1">
                <Label htmlFor="inventory-item-availability-comment">
                  {t("inventory.form.availabilityComment")} *
                </Label>
                <Input
                  id="inventory-item-availability-comment"
                  {...register("availabilityComment")}
                  placeholder={t("inventory.form.availabilityCommentPlaceholder")}
                />
                {errors.availabilityComment ? (
                  <p className="text-sm text-destructive">{errors.availabilityComment.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory-item-supplier">{t("inventory.form.supplier")}</Label>
            <Input
              id="inventory-item-supplier"
              {...register("supplier")}
              placeholder={t("inventory.form.supplierPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory-item-price">{t("inventory.form.price")}</Label>
            <Input
              id="inventory-item-price"
              type="number"
              step="0.01"
              min={0}
              {...register("price")}
              placeholder={t("inventory.form.pricePlaceholder")}
            />
            {errors.price ? (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory-item-serial">{t("inventory.form.serialNumber")}</Label>
            <Input
              id="inventory-item-serial"
              {...register("serialNumber")}
              placeholder={t("inventory.form.serialNumberPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory-item-warranty">{t("inventory.form.warrantyUntil")}</Label>
            <Input id="inventory-item-warranty" type="date" {...register("warrantyUntil")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory-item-comment">{t("inventory.form.comment")}</Label>
            <Textarea
              id="inventory-item-comment"
              {...register("comment")}
              placeholder={t("inventory.form.commentPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory-item-photos">{t("inventory.form.photos")}</Label>
            <Input
              id="inventory-item-photos"
              type="file"
              accept="image/*"
              multiple
              disabled={isCompressing}
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
                          onClick={() => setValue("avatarPhotoId", photo.id, { shouldDirty: true })}
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
        </div>

        {isPageLayout ? null : (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("inventory.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isCompressing}>
              {submitLabel ?? t("inventory.form.save")}
            </Button>
          </div>
        )}
      </form>

      <CreateCategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onCreated={(category) => {
          pendingCategoryIdRef.current = category.id
          setCategories((prev) =>
            prev.some((item) => item.id === category.id) ? prev : [...prev, category],
          )
        }}
      />

      <CreateSubcategoryDialog
        open={createSubcategoryOpen}
        categoryId={categoryId}
        categoryName={categories.find((category) => category.id === categoryId)?.name ?? ""}
        onOpenChange={setCreateSubcategoryOpen}
        onCreated={(subcategory) => {
          pendingSubcategoryIdRef.current = subcategory.id
          setSubcategories((prev) =>
            prev.some((item) => item.id === subcategory.id) ? prev : [...prev, subcategory],
          )
        }}
      />

      <CreateLocationDialog
        open={createLocationOpen}
        onOpenChange={setCreateLocationOpen}
        onCreated={(location) => {
          pendingLocationIdRef.current = location.id
          setLocations((prev) =>
            prev.some((item) => item.id === location.id) ? prev : [...prev, location],
          )
        }}
      />
    </>
  )
}
