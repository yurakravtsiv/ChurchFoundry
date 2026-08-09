import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  FilterX,
  MoreVertical,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react"
import { motion } from "motion/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router"
import { InventoryItemForm } from "@/components/inventory/InventoryItemForm"
import { ReturnToStockDialog } from "@/components/inventory/ReturnToStockDialog"
import { WriteOffDialog } from "@/components/inventory/WriteOffDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DisabledTooltip } from "@/components/ui/disabled-tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { QueryErrorState } from "@/components/ui/query-error-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  useArchiveInventoryItemMutation,
  useCategoriesQuery,
  useCreateInventoryItemMutation,
  useInventoryItemsQuery,
  useLocationsQuery,
  useSubcategoriesQuery,
} from "@/hooks/queries/useInventoryQueries"
import { useTypewriterPlaceholder } from "@/hooks/useTypewriterPlaceholder"
import { exportToPdf, exportToXlsx, prepareExportData } from "@/lib/inventoryExport"
import { itemMatchesSearch } from "@/lib/inventorySearch"
import { cn } from "@/lib/utils"
import type { AvailabilityStatus, InventoryItem, ItemCondition } from "@/types/inventory"

const rowMenuListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

const rowMenuItemVariants = {
  hidden: { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.1 } },
}

function FilterClearButton({
  visible,
  label,
  onClear,
  className,
}: {
  visible: boolean
  label: string
  onClear: () => void
  className?: string
}) {
  if (!visible) {
    return null
  }

  return (
    <button
      type="button"
      className={cn(
        "absolute top-1/2 z-10 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClear()
      }}
      aria-label={label}
    >
      <X className="size-3.5" aria-hidden />
    </button>
  )
}

const SEARCH_EXAMPLE_WORDS = {
  uk: ["мікрофон", "проектор", "звукова система", "склад", "потребує ремонту"],
  en: ["microphone", "projector", "sound system", "storage", "needs repair"],
} as const

function InventorySearchInput({
  id,
  value,
  onChange,
  onClear,
  clearLabel,
  ariaLabel,
  typewriterText,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
  clearLabel: string
  ariaLabel: string
  typewriterText: string
}) {
  const showTypewriter = value.length === 0

  return (
    <div className="relative min-w-0">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder=""
        aria-label={ariaLabel}
        className={cn("h-9 min-w-0 pl-8", value && "pr-8")}
      />
      {showTypewriter ? (
        <span
          className="pointer-events-none absolute inset-y-0 left-8 right-3 flex items-center truncate text-sm text-muted-foreground"
          aria-hidden
        >
          <span className="truncate">{typewriterText}</span>
          <span
            className="ml-px inline-block w-[1ch] shrink-0 animate-[caret-blink_1s_step-end_infinite]"
            aria-hidden
          >
            |
          </span>
        </span>
      ) : null}
      <FilterClearButton
        visible={Boolean(value)}
        label={clearLabel}
        className="right-2"
        onClear={onClear}
      />
    </div>
  )
}

function TruncatedCell({
  value,
  className,
  empty = "—",
}: {
  value: string | null | undefined
  className?: string
  empty?: string
}) {
  const text = value?.trim() ? value.trim() : empty
  const hasValue = Boolean(value?.trim())

  return (
    <span
      className={cn("block max-w-[10rem] truncate", className)}
      title={hasValue ? text : undefined}
    >
      {text}
    </span>
  )
}

function initialConditionFilter(searchParams: URLSearchParams) {
  const value = searchParams.get("condition")
  return value === "needs_repair" || value === "good" ? value : "all"
}

function initialAvailabilityFilter(searchParams: URLSearchParams) {
  const value = searchParams.get("availability")
  return value === "borrowed" || value === "in_church" ? value : "all"
}

export function InventoryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { search: locationSearch } = useLocation()

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
  const createItemMutation = useCreateInventoryItemMutation()
  const archiveItemMutation = useArchiveInventoryItemMutation()

  const isLoading = itemsLoading || categoriesLoading || subcategoriesLoading || locationsLoading
  const isError = itemsError || categoriesError || subcategoriesError || locationsError
  const refetchAll = useCallback(() => {
    void refetchItems()
    void refetchCategories()
    void refetchSubcategories()
    void refetchLocations()
  }, [refetchCategories, refetchItems, refetchLocations, refetchSubcategories])

  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState("")
  const searchExampleWords = useMemo(
    () =>
      i18n.language.startsWith("en") ? [...SEARCH_EXAMPLE_WORDS.en] : [...SEARCH_EXAMPLE_WORDS.uk],
    [i18n.language],
  )
  const searchTypewriterText = useTypewriterPlaceholder(searchExampleWords)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [subcategoryFilter, setSubcategoryFilter] = useState("all")
  const [availabilityFilter, setAvailabilityFilter] = useState(() =>
    initialAvailabilityFilter(new URLSearchParams(locationSearch)),
  )
  const [locationFilter, setLocationFilter] = useState("all")
  const [conditionFilter, setConditionFilter] = useState(() =>
    initialConditionFilter(new URLSearchParams(locationSearch)),
  )
  const [showArchived, setShowArchived] = useState(false)
  const [showWrittenOff, setShowWrittenOff] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createFormDirty, setCreateFormDirty] = useState(false)
  const [discardCreateOpen, setDiscardCreateOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<InventoryItem | null>(null)
  const [writeOffTarget, setWriteOffTarget] = useState<InventoryItem | null>(null)
  const [returnToStockTarget, setReturnToStockTarget] = useState<InventoryItem | null>(null)

  const formatWriteOffDate = useCallback(
    (value: string | null) => {
      if (!value) {
        return "—"
      }
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return value.slice(0, 10)
      }
      return date.toLocaleDateString(i18n.language)
    },
    [i18n.language],
  )

  // Keep filters in sync when arriving via dashboard deep-links or sidebar (same route instance).
  useEffect(() => {
    const params = new URLSearchParams(locationSearch)
    setConditionFilter(initialConditionFilter(params))
    setAvailabilityFilter(initialAvailabilityFilter(params))
  }, [locationSearch])

  const requestCloseCreate = useCallback(() => {
    if (createFormDirty) {
      setDiscardCreateOpen(true)
      return
    }
    setCreateOpen(false)
    setCreateFormDirty(false)
  }, [createFormDirty])

  const confirmDiscardCreate = useCallback(() => {
    setDiscardCreateOpen(false)
    setCreateFormDirty(false)
    setCreateOpen(false)
  }, [])

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]))
  }, [categories])

  const subcategoryNameById = useMemo(() => {
    return new Map(subcategories.map((subcategory) => [subcategory.id, subcategory.name]))
  }, [subcategories])

  const locationNameById = useMemo(() => {
    return new Map(locations.map((location) => [location.id, location.name]))
  }, [locations])

  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === "all") {
      return []
    }
    return subcategories.filter((subcategory) => subcategory.categoryId === categoryFilter)
  }, [categoryFilter, subcategories])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (showWrittenOff) {
        if (item.condition !== "written_off") {
          return false
        }
      } else if (showArchived) {
        if (!item.archived) {
          return false
        }
      } else {
        if (item.condition === "written_off") {
          return false
        }
        if (item.archived) {
          return false
        }
      }
      if (categoryFilter !== "all" && item.categoryId !== categoryFilter) {
        return false
      }
      if (subcategoryFilter !== "all" && item.subcategoryId !== subcategoryFilter) {
        return false
      }
      if (availabilityFilter !== "all" && item.availability !== availabilityFilter) {
        return false
      }
      if (locationFilter !== "all" && item.locationId !== locationFilter) {
        return false
      }
      if (
        !showWrittenOff &&
        !showArchived &&
        conditionFilter !== "all" &&
        item.condition !== conditionFilter
      ) {
        return false
      }
      if (!itemMatchesSearch(item, search, categories, subcategories, locations, t)) {
        return false
      }
      return true
    })
  }, [
    availabilityFilter,
    categories,
    categoryFilter,
    conditionFilter,
    items,
    locationFilter,
    locations,
    search,
    showArchived,
    showWrittenOff,
    subcategories,
    subcategoryFilter,
    t,
  ])

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => {
    const baseColumns: ColumnDef<InventoryItem>[] = [
      {
        id: "photo",
        header: t("inventory.columns.photo"),
        cell: ({ row }) => {
          const item = row.original
          const avatar = item.avatarPhotoId
            ? item.photos.find((photo) => photo.id === item.avatarPhotoId)
            : undefined
          return (
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
              {avatar ? (
                <img
                  src={avatar.dataUrl}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                />
              ) : (
                <Package className="size-5" aria-hidden />
              )}
            </div>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("inventory.columns.name")}
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.name} className="max-w-[14rem] font-medium" />
        ),
      },
      {
        id: "category",
        header: t("inventory.columns.category"),
        cell: ({ row }) => <TruncatedCell value={categoryNameById.get(row.original.categoryId)} />,
        enableSorting: false,
      },
      {
        id: "subcategory",
        header: t("inventory.columns.subcategory"),
        cell: ({ row }) => (
          <TruncatedCell value={subcategoryNameById.get(row.original.subcategoryId)} />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "quantity",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("inventory.columns.quantity")}
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
      },
      {
        accessorKey: "condition",
        header: t("inventory.columns.condition"),
        cell: ({ row }) => {
          const condition = row.original.condition as ItemCondition
          if (condition === "needs_repair") {
            return (
              <Badge className="border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {t("inventory.condition.needsRepair")}
              </Badge>
            )
          }
          if (condition === "written_off") {
            return <Badge variant="secondary">{t("inventory.condition.writtenOff")}</Badge>
          }
          return <Badge variant="success">{t("inventory.condition.good")}</Badge>
        },
        enableSorting: false,
      },
    ]

    if (showWrittenOff) {
      baseColumns.push(
        {
          id: "writeOffDate",
          header: t("inventory.columns.writeOffDate"),
          cell: ({ row }) => (
            <span className="whitespace-nowrap tabular-nums">
              {formatWriteOffDate(row.original.writeOffDate)}
            </span>
          ),
          enableSorting: false,
        },
        {
          id: "writeOffReason",
          header: t("inventory.columns.writeOffReason"),
          cell: ({ row }) => (
            <TruncatedCell value={row.original.writeOffReason ?? ""} className="max-w-[14rem]" />
          ),
          enableSorting: false,
        },
      )
    }

    baseColumns.push(
      {
        accessorKey: "locationId",
        header: t("inventory.columns.location"),
        cell: ({ row }) => <TruncatedCell value={locationNameById.get(row.original.locationId)} />,
        enableSorting: false,
      },
      {
        accessorKey: "availability",
        header: t("inventory.columns.availability"),
        cell: ({ row }) => {
          const status = row.original.availability as AvailabilityStatus
          if (status === "borrowed") {
            return <Badge variant="warning">{t("inventory.availability.borrowed")}</Badge>
          }
          return <Badge variant="success">{t("inventory.availability.inChurch")}</Badge>
        },
        enableSorting: false,
      },
      {
        accessorKey: "availabilityComment",
        header: t("inventory.columns.availabilityComment"),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.availabilityComment} className="max-w-[12rem]" />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "comment",
        header: t("inventory.columns.comment"),
        cell: ({ row }) => <TruncatedCell value={row.original.comment} className="max-w-[14rem]" />,
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const item = row.original
          const isWrittenOff = item.condition === "written_off"
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t("inventory.actions.menu")}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                <motion.div initial="hidden" animate="visible" variants={rowMenuListVariants}>
                  <motion.div variants={rowMenuItemVariants}>
                    <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}`)}>
                      <Pencil />
                      {t("inventory.actions.edit")}
                    </DropdownMenuItem>
                  </motion.div>
                  <motion.div variants={rowMenuItemVariants}>
                    {isWrittenOff ? (
                      <DropdownMenuItem onClick={() => setReturnToStockTarget(item)}>
                        <PackagePlus />
                        {t("inventory.actions.returnToStock")}
                      </DropdownMenuItem>
                    ) : item.archived ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <PackageMinus />
                                {t("inventory.actions.writeOff")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.writeOffArchivedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <DropdownMenuItem onClick={() => setWriteOffTarget(item)}>
                        <PackageMinus />
                        {t("inventory.actions.writeOff")}
                      </DropdownMenuItem>
                    )}
                  </motion.div>
                  <motion.div variants={rowMenuItemVariants}>
                    {isWrittenOff ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Archive />
                                {t("inventory.actions.archive")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.archiveWrittenOffHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <DropdownMenuItem onClick={() => setArchiveTarget(item)}>
                        {item.archived ? <ArchiveRestore /> : <Archive />}
                        {item.archived
                          ? t("inventory.actions.unarchive")
                          : t("inventory.actions.archive")}
                      </DropdownMenuItem>
                    )}
                  </motion.div>
                </motion.div>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        enableSorting: false,
      },
    )

    return baseColumns
  }, [
    categoryNameById,
    formatWriteOffDate,
    locationNameById,
    navigate,
    showWrittenOff,
    subcategoryNameById,
    t,
  ])

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const confirmArchiveAction = () => {
    if (!archiveTarget) {
      return
    }
    archiveItemMutation.mutate(
      { id: archiveTarget.id, currentlyArchived: archiveTarget.archived },
      {
        onSuccess: () => {
          setArchiveTarget(null)
        },
      },
    )
  }

  const skeletonColumnCount = showWrittenOff ? 13 : 11
  const skeletonColumnClassNames = showWrittenOff
    ? [
        "size-10",
        "h-4 w-32",
        "h-4 w-24",
        "h-4 w-24",
        "h-4 w-10",
        "h-4 w-20",
        "h-4 w-24",
        "h-4 w-28",
        "h-4 w-24",
        "h-4 w-20",
        "h-4 w-28",
        "h-4 w-28",
        "size-8",
      ]
    : [
        "size-10",
        "h-4 w-32",
        "h-4 w-24",
        "h-4 w-24",
        "h-4 w-10",
        "h-4 w-20",
        "h-4 w-24",
        "h-4 w-20",
        "h-4 w-28",
        "h-4 w-28",
        "size-8",
      ]

  const openCreate = () => setCreateOpen(true)

  const hasActiveFilters =
    Boolean(search) ||
    categoryFilter !== "all" ||
    subcategoryFilter !== "all" ||
    availabilityFilter !== "all" ||
    locationFilter !== "all" ||
    conditionFilter !== "all" ||
    showArchived ||
    showWrittenOff

  const clearAllFilters = () => {
    setSearch("")
    setCategoryFilter("all")
    setSubcategoryFilter("all")
    setAvailabilityFilter("all")
    setLocationFilter("all")
    setConditionFilter("all")
    setShowArchived(false)
    setShowWrittenOff(false)
  }

  const runExport = async (format: "xlsx" | "pdf") => {
    const exportOptions = { includeWriteOffColumns: showWrittenOff }
    const exportItems =
      showWrittenOff || showArchived
        ? filteredItems
        : filteredItems.filter((item) => !item.removed && !item.archived)
    if (exportItems.length === 0) {
      window.alert(t("inventory.export.empty"))
      return
    }
    if (format === "xlsx") {
      exportToXlsx(
        prepareExportData(exportItems, categories, subcategories, locations, t, exportOptions),
        t,
        exportOptions,
      )
      return
    }
    await exportToPdf(exportItems, categories, subcategories, locations, t, exportOptions)
  }

  const isStorageEmpty = items.length === 0
  const isFilterEmpty = !isStorageEmpty && filteredItems.length === 0

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 bg-background px-[15px] py-[10px]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-end gap-2 md:justify-between">
          <div className="hidden min-w-0 flex-1 md:block md:max-w-sm">
            <InventorySearchInput
              id="inventory-search"
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
              clearLabel={t("inventory.filters.clear")}
              ariaLabel={t("inventory.searchPlaceholder")}
              typewriterText={searchTypewriterText}
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              {t("inventory.addItem")}
            </Button>
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        // Blur so the tooltip does not stick open after click (Radix keeps it on focus).
                        event.currentTarget.blur()
                        void runExport("xlsx")
                      }}
                    >
                      <FileSpreadsheet className="size-4" />
                      {t("inventory.export.xlsx")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("inventory.export.xlsxTooltip")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.currentTarget.blur()
                        void runExport("pdf")
                      }}
                    >
                      <FileText className="size-4" />
                      {t("inventory.export.pdf")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("inventory.export.pdfTooltip")}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:gap-2">
          <div className="grid grid-cols-3 items-end gap-2 md:contents">
            <div className="flex min-w-0 flex-col gap-1.5 md:hidden">
              <Label htmlFor="inventory-search-mobile" className="truncate">
                {t("inventory.searchPlaceholder")}
              </Label>
              <InventorySearchInput
                id="inventory-search-mobile"
                value={search}
                onChange={setSearch}
                onClear={() => setSearch("")}
                clearLabel={t("inventory.filters.clear")}
                ariaLabel={t("inventory.searchPlaceholder")}
                typewriterText={searchTypewriterText}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="inventory-filter-category" className="truncate">
                {t("inventory.filters.category")}
              </Label>
              <div className="relative min-w-0">
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value)
                    setSubcategoryFilter("all")
                  }}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger
                    id="inventory-filter-category"
                    className={cn(
                      "h-9 w-full min-w-0",
                      categoryFilter !== "all" && "pr-8 [&>svg]:hidden",
                    )}
                  >
                    <SelectValue
                      placeholder={
                        categoriesLoading ? t("common.loading") : t("inventory.filters.all")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FilterClearButton
                  visible={categoryFilter !== "all"}
                  label={t("inventory.filters.clear")}
                  className="right-2"
                  onClear={() => {
                    setCategoryFilter("all")
                    setSubcategoryFilter("all")
                  }}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="inventory-filter-subcategory" className="truncate">
                {t("inventory.filters.subcategory")}
              </Label>
              <div className="relative min-w-0">
                <DisabledTooltip
                  disabled={categoryFilter === "all"}
                  tip={t("inventory.subcategoryDisabledHint")}
                >
                  <Select
                    value={subcategoryFilter}
                    onValueChange={setSubcategoryFilter}
                    disabled={categoryFilter === "all" || subcategoriesLoading}
                  >
                    <SelectTrigger
                      id="inventory-filter-subcategory"
                      className={cn(
                        "h-9 w-full min-w-0",
                        categoryFilter === "all" && "pointer-events-none",
                        subcategoryFilter !== "all" && "pr-8 [&>svg]:hidden",
                      )}
                    >
                      <SelectValue
                        placeholder={
                          subcategoriesLoading ? t("common.loading") : t("inventory.filters.all")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                      {filteredSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DisabledTooltip>
                <FilterClearButton
                  visible={subcategoryFilter !== "all"}
                  label={t("inventory.filters.clear")}
                  className="right-2"
                  onClear={() => setSubcategoryFilter("all")}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 md:contents">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="inventory-filter-availability" className="truncate">
                {t("inventory.filters.availability")}
              </Label>
              <div className="relative min-w-0">
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger
                    id="inventory-filter-availability"
                    className={cn(
                      "h-9 w-full min-w-0",
                      availabilityFilter !== "all" && "pr-8 [&>svg]:hidden",
                    )}
                  >
                    <SelectValue placeholder={t("inventory.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                    <SelectItem value="in_church">
                      {t("inventory.availability.inChurch")}
                    </SelectItem>
                    <SelectItem value="borrowed">{t("inventory.availability.borrowed")}</SelectItem>
                  </SelectContent>
                </Select>
                <FilterClearButton
                  visible={availabilityFilter !== "all"}
                  label={t("inventory.filters.clear")}
                  className="right-2"
                  onClear={() => setAvailabilityFilter("all")}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="inventory-filter-location" className="truncate">
                {t("inventory.filters.location")}
              </Label>
              <div className="relative min-w-0">
                <Select
                  value={locationFilter}
                  onValueChange={setLocationFilter}
                  disabled={locationsLoading}
                >
                  <SelectTrigger
                    id="inventory-filter-location"
                    className={cn(
                      "h-9 w-full min-w-0",
                      locationFilter !== "all" && "pr-8 [&>svg]:hidden",
                    )}
                  >
                    <SelectValue
                      placeholder={
                        locationsLoading ? t("common.loading") : t("inventory.filters.all")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FilterClearButton
                  visible={locationFilter !== "all"}
                  label={t("inventory.filters.clear")}
                  className="right-2"
                  onClear={() => setLocationFilter("all")}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="inventory-filter-condition" className="truncate">
                {t("inventory.filters.condition")}
              </Label>
              <div className="relative min-w-0">
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger
                    id="inventory-filter-condition"
                    className={cn(
                      "h-9 w-full min-w-0",
                      conditionFilter !== "all" && "pr-8 [&>svg]:hidden",
                    )}
                  >
                    <SelectValue placeholder={t("inventory.filters.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                    <SelectItem value="good">{t("inventory.condition.good")}</SelectItem>
                    <SelectItem value="needs_repair">
                      {t("inventory.condition.needsRepair")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FilterClearButton
                  visible={conditionFilter !== "all"}
                  label={t("inventory.filters.clear")}
                  className="right-2"
                  onClear={() => setConditionFilter("all")}
                />
              </div>
            </div>

            <TooltipProvider delayDuration={200}>
              <div className="flex shrink-0 items-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-9 items-center gap-2">
                      <PackageMinus
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          showWrittenOff ? "text-foreground" : "text-muted-foreground",
                        )}
                        aria-hidden
                      />
                      <Switch
                        checked={showWrittenOff}
                        onCheckedChange={(checked) => {
                          setShowWrittenOff(checked)
                          if (checked) {
                            setShowArchived(false)
                          }
                        }}
                        aria-label={
                          showWrittenOff
                            ? t("inventory.hideWrittenOff")
                            : t("inventory.showWrittenOff")
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block">
                    {showWrittenOff ? t("inventory.hideWrittenOff") : t("inventory.showWrittenOff")}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-9 items-center gap-2">
                      <Archive
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          showArchived ? "text-foreground" : "text-muted-foreground",
                        )}
                        aria-hidden
                      />
                      <Switch
                        checked={showArchived}
                        onCheckedChange={(checked) => {
                          setShowArchived(checked)
                          if (checked) {
                            setShowWrittenOff(false)
                          }
                        }}
                        aria-label={
                          showArchived ? t("inventory.hideArchived") : t("inventory.showArchived")
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block">
                    {showArchived ? t("inventory.hideArchived") : t("inventory.showArchived")}
                  </TooltipContent>
                </Tooltip>

                {hasActiveFilters ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={clearAllFilters}
                        aria-label={t("inventory.filters.clearAll")}
                      >
                        <FilterX className="size-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("inventory.filters.clearAll")}</TooltipContent>
                  </Tooltip>
                ) : (
                  <DisabledTooltip
                    disabled
                    tip={t("inventory.filters.clearAllDisabledHint")}
                    className="inline-flex w-auto shrink-0"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="pointer-events-none size-9 shrink-0"
                      disabled
                      aria-label={t("inventory.filters.clearAllDisabledHint")}
                    >
                      <FilterX className="size-4" aria-hidden />
                    </Button>
                  </DisabledTooltip>
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {isError ? (
        <QueryErrorState onRetry={refetchAll} />
      ) : isLoading ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap",
                        (header.column.id === "condition" || header.column.id === "availability") &&
                          "text-center",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableSkeleton
              rows={8}
              columns={skeletonColumnCount}
              columnClassNames={skeletonColumnClassNames}
            />
          </Table>
        </div>
      ) : isStorageEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <Package
            className="size-24 text-muted-foreground sm:size-28"
            strokeWidth={1.25}
            aria-hidden
          />
          <p className="text-xl font-medium tracking-tight text-muted-foreground sm:text-2xl">
            {t("inventory.empty.title")}
          </p>
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" />
            {t("inventory.empty.createFirst")}
          </Button>
        </div>
      ) : isFilterEmpty ? (
        <div className="flex flex-1 items-center justify-center py-16 text-center">
          <p className="text-lg text-muted-foreground">{t("inventory.empty.noResults")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap",
                        (header.column.id === "condition" || header.column.id === "availability") &&
                          "text-center",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer",
                    row.original.archived && "bg-muted/60 text-foreground/85",
                  )}
                  onClick={() => navigate(`/inventory/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        (cell.column.id === "condition" || cell.column.id === "availability") &&
                          "text-center",
                      )}
                      onClick={
                        cell.column.id === "actions"
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) {
            setCreateOpen(true)
            setCreateFormDirty(false)
            return
          }
          requestCloseCreate()
        }}
      >
        <MotionDialogContent open={createOpen} className="gap-0 p-0">
          <DialogHeader className="shrink-0 space-y-1.5 border-b bg-background px-6 py-4 pr-12 text-left">
            <DialogTitle>{t("inventory.addItem")}</DialogTitle>
            <DialogDescription>{t("inventory.form.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <InventoryItemForm
              id="inventory-item-create-form"
              mode="create"
              onDirtyChange={setCreateFormDirty}
              onCancel={requestCloseCreate}
              onSubmit={(data) => {
                createItemMutation.mutate(data, {
                  onSuccess: () => {
                    setCreateFormDirty(false)
                    setCreateOpen(false)
                  },
                })
              }}
            />
          </div>
        </MotionDialogContent>
      </Dialog>

      <Dialog open={discardCreateOpen} onOpenChange={setDiscardCreateOpen}>
        <MotionDialogContent
          open={discardCreateOpen}
          className="z-[70] max-w-sm"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("inventory.unsavedChanges.title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("inventory.unsavedChanges.title")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDiscardCreateOpen(false)}>
              {t("inventory.unsavedChanges.close")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDiscardCreate}>
              {t("inventory.unsavedChanges.no")}
            </Button>
            <Button
              type="submit"
              form="inventory-item-create-form"
              onClick={() => setDiscardCreateOpen(false)}
            >
              {t("inventory.unsavedChanges.yes")}
            </Button>
          </DialogFooter>
        </MotionDialogContent>
      </Dialog>

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null)
          }
        }}
      >
        <MotionDialogContent open={archiveTarget !== null}>
          <DialogHeader>
            <DialogTitle>
              {t(
                archiveTarget?.archived
                  ? "inventory.unarchiveConfirmTitle"
                  : "inventory.archiveConfirmTitle",
                { name: archiveTarget?.name ?? "" },
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                archiveTarget?.archived
                  ? "inventory.unarchiveConfirmDescription"
                  : "inventory.archiveConfirmDescription",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveTarget(null)}>
              {t("inventory.actions.cancel")}
            </Button>
            <Button type="button" onClick={confirmArchiveAction}>
              {archiveTarget?.archived
                ? t("inventory.actions.unarchive")
                : t("inventory.actions.archive")}
            </Button>
          </DialogFooter>
        </MotionDialogContent>
      </Dialog>

      <WriteOffDialog
        item={writeOffTarget}
        open={writeOffTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWriteOffTarget(null)
          }
        }}
        onConfirm={() => {
          setWriteOffTarget(null)
        }}
      />

      <ReturnToStockDialog
        item={returnToStockTarget}
        open={returnToStockTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReturnToStockTarget(null)
          }
        }}
        onConfirm={() => {
          setReturnToStockTarget(null)
        }}
      />
    </main>
  )
}
