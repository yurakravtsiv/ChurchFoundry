import {
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FilterX,
  Handshake,
  MoreVertical,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Undo2,
  Wrench,
  X,
} from "lucide-react"
import { motion } from "motion/react"
import { type Ref, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router"
import { BorrowDialog } from "@/components/inventory/BorrowDialog"
import { BorrowReturnDateCell } from "@/components/inventory/BorrowReturnDateCell"
import { InventoryColumnSettingsDialog } from "@/components/inventory/InventoryColumnSettingsDialog"
import { InventoryItemForm } from "@/components/inventory/InventoryItemForm"
import { NeedsRepairDialog } from "@/components/inventory/NeedsRepairDialog"
import { RepairedConfirmDialog } from "@/components/inventory/RepairedConfirmDialog"
import { ReturnBorrowedDialog } from "@/components/inventory/ReturnBorrowedDialog"
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
  useCreateInventoryItemMutation,
  useInventoryItemsQuery,
  useInventoryReferenceLookupsQuery,
} from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import { useTypewriterPlaceholder } from "@/hooks/useTypewriterPlaceholder"
import {
  getSearchableColumnIds,
  type InventoryColumnPrefs,
  resolveVisibleColumnIds,
} from "@/lib/inventoryColumnConfig"
import { loadInventoryColumnPrefs, saveInventoryColumnPrefs } from "@/lib/inventoryColumnPrefs"
import { exportToPdf, exportToXlsx, prepareExportData } from "@/lib/inventoryExport"
import { availabilityLabel, conditionLabel } from "@/lib/inventoryLabels"
import { optionsUsedByItems } from "@/lib/inventoryReferenceOptions"
import { itemMatchesSearch } from "@/lib/inventorySearch"
import {
  DEFAULT_INVENTORY_SORTING,
  DEFAULT_INVENTORY_TABLE_VIEW,
  type InventoryTableViewState,
  isDefaultInventorySorting,
  loadInventoryTableView,
  saveInventoryTableView,
} from "@/lib/inventoryTableView"
import { compareLocaleText, sortByName } from "@/lib/localeCompare"
import { filterVisible } from "@/lib/removedEntity"
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

function parseDateMs(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Null/invalid dates always sort last, in both ascending and descending order. */
function compareNullableDateSort(aMs: number | null, bMs: number | null, desc: boolean): number {
  const aNull = aMs === null
  const bNull = bMs === null
  if (aNull && bNull) {
    return 0
  }
  if (aNull) {
    return desc ? -1 : 1
  }
  if (bNull) {
    return desc ? 1 : -1
  }
  return aMs - bMs
}

function createNullableDateSortingFn(
  getDateMs: (item: InventoryItem) => number | null,
): SortingFn<InventoryItem> {
  return (rowA, rowB, columnId) => {
    const column = rowA._getAllCellsByColumnId()[columnId]?.column
    const desc = column?.getIsSorted() === "desc"
    return compareNullableDateSort(getDateMs(rowA.original), getDateMs(rowB.original), desc)
  }
}

function SortableColumnHeader({
  label,
  column,
}: {
  label: string
  column: Column<InventoryItem, unknown>
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="size-3.5" />
    </Button>
  )
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
  inputRef,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
  clearLabel: string
  ariaLabel: string
  typewriterText: string
  inputRef?: Ref<HTMLInputElement>
}) {
  const showTypewriter = value.length === 0

  return (
    <div className="relative min-w-0">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
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

function buildInventoryFilterSearch(availabilityFilter: string, conditionFilter: string): string {
  const params = new URLSearchParams()
  if (availabilityFilter === "borrowed" || availabilityFilter === "in_church") {
    params.set("availability", availabilityFilter)
  }
  if (conditionFilter === "needs_repair" || conditionFilter === "good") {
    params.set("condition", conditionFilter)
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

function getInitialInventoryTableView(locationSearch: string): InventoryTableViewState {
  const stored = loadInventoryTableView()
  const params = new URLSearchParams(locationSearch)
  return {
    ...stored,
    availabilityFilter: params.has("availability")
      ? initialAvailabilityFilter(params)
      : stored.availabilityFilter,
    conditionFilter: params.has("condition")
      ? initialConditionFilter(params)
      : stored.conditionFilter,
  }
}

export function InventoryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { search: locationSearch } = useLocation()
  const { user } = useAuth()
  const userEmail = user?.email ?? ""

  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useInventoryItemsQuery()
  const {
    data: lookups,
    isLoading: lookupsLoading,
    isError: lookupsError,
    refetch: refetchLookups,
  } = useInventoryReferenceLookupsQuery()
  const createItemMutation = useCreateInventoryItemMutation()
  const archiveItemMutation = useArchiveInventoryItemMutation()

  const categories = lookups?.categories ?? []
  const subcategories = lookups?.subcategories ?? []
  const locations = lookups?.locations ?? []
  const responsibles = lookups?.responsibles ?? []

  const isLoading = itemsLoading || lookupsLoading
  const isError = itemsError || lookupsError
  const refetchAll = useCallback(() => {
    void refetchItems()
    void refetchLookups()
  }, [refetchItems, refetchLookups])

  const [tableView] = useState(() => getInitialInventoryTableView(locationSearch))
  const [sorting, setSorting] = useState<SortingState>(tableView.sorting)
  const [search, setSearch] = useState(tableView.search)
  const searchExampleWords = useMemo(
    () =>
      i18n.language.startsWith("en") ? [...SEARCH_EXAMPLE_WORDS.en] : [...SEARCH_EXAMPLE_WORDS.uk],
    [i18n.language],
  )
  const searchTypewriterText = useTypewriterPlaceholder(searchExampleWords)
  const [categoryFilter, setCategoryFilter] = useState(tableView.categoryFilter)
  const [subcategoryFilter, setSubcategoryFilter] = useState(tableView.subcategoryFilter)
  const [availabilityFilter, setAvailabilityFilter] = useState(tableView.availabilityFilter)
  const [locationFilter, setLocationFilter] = useState(tableView.locationFilter)
  const [responsibleFilter, setResponsibleFilter] = useState(tableView.responsibleFilter)
  const [conditionFilter, setConditionFilter] = useState(tableView.conditionFilter)
  const [showArchived, setShowArchived] = useState(tableView.showArchived)
  const [showWrittenOff, setShowWrittenOff] = useState(tableView.showWrittenOff)
  const [columnPrefs, setColumnPrefs] = useState<InventoryColumnPrefs>(loadInventoryColumnPrefs)
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const desktopSearchRef = useRef<HTMLInputElement>(null)
  const mobileSearchRef = useRef<HTMLInputElement>(null)
  const filterHeaderSentinelRef = useRef<HTMLDivElement>(null)
  const [filterHeaderScrolled, setFilterHeaderScrolled] = useState(false)

  useEffect(() => {
    const focusVisibleSearch = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches
      const target = isDesktop ? desktopSearchRef.current : mobileSearchRef.current
      target?.focus({ preventScroll: true })
    }
    const frame = requestAnimationFrame(focusVisibleSearch)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const sentinel = filterHeaderSentinelRef.current
    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setFilterHeaderScrolled(!entry.isIntersecting)
        }
      },
      { threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const [createFormDirty, setCreateFormDirty] = useState(false)
  const [discardCreateOpen, setDiscardCreateOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<InventoryItem | null>(null)
  const [writeOffTarget, setWriteOffTarget] = useState<InventoryItem | null>(null)
  const [returnToStockTarget, setReturnToStockTarget] = useState<InventoryItem | null>(null)
  const [needsRepairTarget, setNeedsRepairTarget] = useState<InventoryItem | null>(null)
  const [repairedConfirmTarget, setRepairedConfirmTarget] = useState<InventoryItem | null>(null)
  const [borrowTarget, setBorrowTarget] = useState<InventoryItem | null>(null)
  const [returnBorrowedTarget, setReturnBorrowedTarget] = useState<InventoryItem | null>(null)

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

  useEffect(() => {
    saveInventoryTableView({
      sorting,
      search,
      categoryFilter,
      subcategoryFilter,
      availabilityFilter,
      locationFilter,
      responsibleFilter,
      conditionFilter,
      showArchived,
      showWrittenOff,
    })
  }, [
    availabilityFilter,
    categoryFilter,
    conditionFilter,
    locationFilter,
    responsibleFilter,
    search,
    showArchived,
    showWrittenOff,
    sorting,
    subcategoryFilter,
  ])

  // Dashboard tiles set query params; empty /inventory keeps the stored filters.
  useEffect(() => {
    const params = new URLSearchParams(locationSearch)
    if (params.has("availability")) {
      setAvailabilityFilter(initialAvailabilityFilter(params))
    }
    if (params.has("condition")) {
      setConditionFilter(initialConditionFilter(params))
    }
  }, [locationSearch])

  const syncInventoryFilterSearchToUrl = useCallback(
    (availability: string, condition: string) => {
      const nextSearch = buildInventoryFilterSearch(availability, condition)
      if (nextSearch !== locationSearch) {
        navigate({ pathname: "/inventory", search: nextSearch }, { replace: true })
      }
    },
    [locationSearch, navigate],
  )

  const applyAvailabilityFilter = useCallback(
    (value: string) => {
      setAvailabilityFilter(value)
      syncInventoryFilterSearchToUrl(value, conditionFilter)
    },
    [conditionFilter, syncInventoryFilterSearchToUrl],
  )

  const applyConditionFilter = useCallback(
    (value: string) => {
      setConditionFilter(value)
      syncInventoryFilterSearchToUrl(availabilityFilter, value)
    },
    [availabilityFilter, syncInventoryFilterSearchToUrl],
  )

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

  const responsibleNameById = useMemo(() => {
    return new Map(responsibles.map((responsible) => [responsible.id, responsible.name]))
  }, [responsibles])

  const categoryFilterOptions = useMemo(() => {
    return sortByName(
      optionsUsedByItems(
        filterVisible(categories),
        categories,
        items.map((item) => item.categoryId),
      ),
      i18n.language,
    )
  }, [categories, i18n.language, items])

  const locationFilterOptions = useMemo(() => {
    return sortByName(
      optionsUsedByItems(
        filterVisible(locations),
        locations,
        items.map((item) => item.locationId),
      ),
      i18n.language,
    )
  }, [i18n.language, items, locations])

  const responsibleFilterOptions = useMemo(() => {
    return sortByName(
      optionsUsedByItems(
        filterVisible(responsibles),
        responsibles,
        items.map((item) => item.responsibleId),
      ),
      i18n.language,
    )
  }, [i18n.language, items, responsibles])

  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === "all") {
      return []
    }
    const visible = filterVisible(subcategories).filter(
      (subcategory) => subcategory.categoryId === categoryFilter,
    )
    const lookupForCategory = subcategories.filter(
      (subcategory) => subcategory.categoryId === categoryFilter,
    )
    const usedIds = items
      .filter((item) => item.categoryId === categoryFilter)
      .map((item) => item.subcategoryId)
    return sortByName(optionsUsedByItems(visible, lookupForCategory, usedIds), i18n.language)
  }, [categoryFilter, i18n.language, items, subcategories])

  const searchableColumnIds = useMemo(() => getSearchableColumnIds(columnPrefs), [columnPrefs])

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
      if (responsibleFilter !== "all" && item.responsibleId !== responsibleFilter) {
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
      if (
        !itemMatchesSearch(
          item,
          search,
          categories,
          subcategories,
          locations,
          responsibles,
          t,
          searchableColumnIds,
        )
      ) {
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
    responsibleFilter,
    responsibles,
    search,
    searchableColumnIds,
    showArchived,
    showWrittenOff,
    subcategories,
    subcategoryFilter,
    t,
  ])

  const hasRepairItems = useMemo(
    () => filteredItems.some((item) => item.condition === "needs_repair"),
    [filteredItems],
  )
  const hasBorrowedItems = useMemo(
    () => filteredItems.some((item) => item.availability === "borrowed"),
    [filteredItems],
  )

  const columnContext = useMemo(
    () => ({
      hasRepairItems,
      hasBorrowedItems,
      showWrittenOff,
    }),
    [hasBorrowedItems, hasRepairItems, showWrittenOff],
  )

  const visibleColumnIds = useMemo(
    () => resolveVisibleColumnIds(columnPrefs, columnContext),
    [columnContext, columnPrefs],
  )

  // Drop sort when the sorted column is no longer visible.
  useEffect(() => {
    const visible = new Set<string>(visibleColumnIds)
    setSorting((prev) => {
      const next = prev.filter((entry) => visible.has(entry.id))
      if (next.length === prev.length) {
        return prev
      }
      return next.length > 0 ? next : [...DEFAULT_INVENTORY_SORTING]
    })
  }, [visibleColumnIds])

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
        id: "inventoryNumberId",
        accessorKey: "inventoryNumberId",
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.inventoryNumberId")} column={column} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">{row.original.inventoryNumberId}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        sortingFn: (rowA, rowB) =>
          compareLocaleText(rowA.original.name, rowB.original.name, i18n.language),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.name")} column={column} />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.name} className="max-w-[14rem] font-medium" />
        ),
      },
      {
        id: "category",
        accessorFn: (row) => categoryNameById.get(row.categoryId) ?? "",
        sortingFn: (rowA, rowB) =>
          compareLocaleText(
            categoryNameById.get(rowA.original.categoryId) ?? "",
            categoryNameById.get(rowB.original.categoryId) ?? "",
            i18n.language,
          ),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.category")} column={column} />
        ),
        cell: ({ row }) => <TruncatedCell value={categoryNameById.get(row.original.categoryId)} />,
      },
      {
        id: "subcategory",
        accessorFn: (row) => subcategoryNameById.get(row.subcategoryId) ?? "",
        sortingFn: (rowA, rowB) =>
          compareLocaleText(
            subcategoryNameById.get(rowA.original.subcategoryId) ?? "",
            subcategoryNameById.get(rowB.original.subcategoryId) ?? "",
            i18n.language,
          ),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.subcategory")} column={column} />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={subcategoryNameById.get(row.original.subcategoryId)} />
        ),
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.quantity")} column={column} />
        ),
      },
      {
        id: "location",
        accessorFn: (row) => locationNameById.get(row.locationId) ?? "",
        sortingFn: (rowA, rowB) =>
          compareLocaleText(
            locationNameById.get(rowA.original.locationId) ?? "",
            locationNameById.get(rowB.original.locationId) ?? "",
            i18n.language,
          ),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.location")} column={column} />
        ),
        cell: ({ row }) => <TruncatedCell value={locationNameById.get(row.original.locationId)} />,
      },
      {
        id: "responsible",
        accessorFn: (row) => responsibleNameById.get(row.responsibleId) ?? "",
        sortingFn: (rowA, rowB) =>
          compareLocaleText(
            responsibleNameById.get(rowA.original.responsibleId) ?? "",
            responsibleNameById.get(rowB.original.responsibleId) ?? "",
            i18n.language,
          ),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.responsible")} column={column} />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={responsibleNameById.get(row.original.responsibleId)} />
        ),
      },
      {
        id: "condition",
        accessorFn: (row) => conditionLabel(row.condition as ItemCondition, t),
        sortingFn: (rowA, rowB) =>
          compareLocaleText(
            conditionLabel(rowA.original.condition as ItemCondition, t),
            conditionLabel(rowB.original.condition as ItemCondition, t),
            i18n.language,
          ),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.condition")} column={column} />
        ),
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
      },
    ]

    baseColumns.push(
      {
        id: "repairDate",
        accessorFn: (row) => (row.condition === "needs_repair" ? (row.repairDate ?? null) : null),
        sortingFn: createNullableDateSortingFn((item) =>
          item.condition === "needs_repair" ? parseDateMs(item.repairDate) : null,
        ),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.repairDate")} column={column} />
        ),
        cell: ({ row }) => {
          const item = row.original
          if (item.condition !== "needs_repair") {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <span className="whitespace-nowrap tabular-nums">
              {formatWriteOffDate(item.repairDate)}
            </span>
          )
        },
      },
      {
        id: "repairComment",
        header: t("inventory.columns.repairComment"),
        cell: ({ row }) => {
          const item = row.original
          if (item.condition !== "needs_repair") {
            return <span className="text-muted-foreground">—</span>
          }
          return <TruncatedCell value={item.repairComment ?? ""} className="max-w-[14rem]" />
        },
        enableSorting: false,
      },
    )

    baseColumns.push({
      id: "availability",
      accessorFn: (row) => availabilityLabel(row.availability as AvailabilityStatus, t),
      sortingFn: (rowA, rowB) =>
        compareLocaleText(
          availabilityLabel(rowA.original.availability as AvailabilityStatus, t),
          availabilityLabel(rowB.original.availability as AvailabilityStatus, t),
          i18n.language,
        ),
      header: ({ column }) => (
        <SortableColumnHeader label={t("inventory.columns.availability")} column={column} />
      ),
      cell: ({ row }) => {
        const status = row.original.availability as AvailabilityStatus
        if (status === "borrowed") {
          return <Badge variant="warning">{t("inventory.availability.borrowed")}</Badge>
        }
        return <Badge variant="success">{t("inventory.availability.inChurch")}</Badge>
      },
    })

    baseColumns.push({
      id: "borrowDate",
      accessorFn: (row) => (row.availability === "borrowed" ? (row.borrowDate ?? null) : null),
      sortingFn: createNullableDateSortingFn((item) =>
        item.availability === "borrowed" ? parseDateMs(item.borrowDate) : null,
      ),
      header: ({ column }) => (
        <SortableColumnHeader label={t("inventory.columns.borrowDate")} column={column} />
      ),
      cell: ({ row }) => {
        const item = row.original
        if (item.availability !== "borrowed") {
          return <span className="text-muted-foreground">—</span>
        }
        return (
          <span className="whitespace-nowrap tabular-nums">
            {formatWriteOffDate(item.borrowDate)}
          </span>
        )
      },
    })

    baseColumns.push({
      id: "returnDate",
      accessorFn: (row) => (row.availability === "borrowed" ? (row.returnDate ?? null) : null),
      sortingFn: createNullableDateSortingFn((item) =>
        item.availability === "borrowed" ? parseDateMs(item.returnDate) : null,
      ),
      header: ({ column }) => (
        <SortableColumnHeader label={t("inventory.columns.returnDate")} column={column} />
      ),
      cell: ({ row }) => {
        const item = row.original
        if (item.availability !== "borrowed") {
          return <span className="text-muted-foreground">—</span>
        }
        return (
          <BorrowReturnDateCell
            returnDate={item.returnDate}
            formattedDate={formatWriteOffDate(item.returnDate)}
          />
        )
      },
    })

    baseColumns.push(
      {
        id: "writeOffDate",
        accessorFn: (row) => row.writeOffDate ?? null,
        sortingFn: createNullableDateSortingFn((item) => parseDateMs(item.writeOffDate)),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.writeOffDate")} column={column} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatWriteOffDate(row.original.writeOffDate)}
          </span>
        ),
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

    baseColumns.push(
      {
        id: "availabilityComment",
        accessorKey: "availabilityComment",
        header: t("inventory.columns.availabilityComment"),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.availabilityComment} className="max-w-[12rem]" />
        ),
        enableSorting: false,
      },
      {
        id: "supplier",
        accessorKey: "supplier",
        sortingFn: (rowA, rowB) =>
          compareLocaleText(rowA.original.supplier, rowB.original.supplier, i18n.language),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.supplier")} column={column} />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.supplier} />,
      },
      {
        id: "price",
        accessorKey: "price",
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.price")} column={column} />
        ),
        cell: ({ row }) => {
          const price = row.original.price
          if (price == null) {
            return <span className="text-muted-foreground">—</span>
          }
          return <span className="whitespace-nowrap tabular-nums">{price}</span>
        },
      },
      {
        id: "serialNumber",
        accessorKey: "serialNumber",
        sortingFn: (rowA, rowB) =>
          compareLocaleText(rowA.original.serialNumber, rowB.original.serialNumber, i18n.language),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.serialNumber")} column={column} />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.serialNumber} />,
      },
      {
        id: "warrantyUntil",
        accessorFn: (row) => row.warrantyUntil ?? null,
        sortingFn: createNullableDateSortingFn((item) => parseDateMs(item.warrantyUntil)),
        header: ({ column }) => (
          <SortableColumnHeader label={t("inventory.columns.warrantyUntil")} column={column} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatWriteOffDate(row.original.warrantyUntil)}
          </span>
        ),
      },
      {
        id: "comment",
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
          const isNeedsRepair = item.condition === "needs_repair"
          const isBorrowed = item.availability === "borrowed"
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
                    {isBorrowed ? (
                      <DropdownMenuItem onClick={() => setReturnBorrowedTarget(item)}>
                        <Undo2 />
                        {t("inventory.actions.returnBorrowed")}
                      </DropdownMenuItem>
                    ) : isWrittenOff ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Handshake />
                                {t("inventory.actions.borrow")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.borrowWrittenOffHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isNeedsRepair ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Handshake />
                                {t("inventory.actions.borrow")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.borrowNeedsRepairHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : item.archived ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Handshake />
                                {t("inventory.actions.borrow")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.borrowArchivedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <DropdownMenuItem onClick={() => setBorrowTarget(item)}>
                        <Handshake />
                        {t("inventory.actions.borrow")}
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
                                <Wrench />
                                {t("inventory.actions.needsRepair")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.needsRepairWrittenOffHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isBorrowed ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Wrench />
                                {t("inventory.actions.needsRepair")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.needsRepairBorrowedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isNeedsRepair ? (
                      <DropdownMenuItem onClick={() => setRepairedConfirmTarget(item)}>
                        <CheckCircle2 />
                        {t("inventory.actions.markRepaired")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setNeedsRepairTarget(item)}>
                        <Wrench />
                        {t("inventory.actions.needsRepair")}
                      </DropdownMenuItem>
                    )}
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
                    ) : isNeedsRepair ? (
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
                            {t("inventory.actions.writeOffNeedsRepairHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isBorrowed ? (
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
                            {t("inventory.actions.writeOffBorrowedHint")}
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
                    ) : isNeedsRepair ? (
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
                            {t("inventory.actions.archiveNeedsRepairHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isBorrowed ? (
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
                            {t("inventory.actions.archiveBorrowedHint")}
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

    const columnById = new Map<string, ColumnDef<InventoryItem>>()
    for (const column of baseColumns) {
      if (column.id) {
        columnById.set(column.id, column)
      }
    }

    const visibleColumns = visibleColumnIds.flatMap((id) => {
      const column = columnById.get(id)
      return column ? [column] : []
    })
    const actionsColumn = columnById.get("actions")
    return actionsColumn ? [...visibleColumns, actionsColumn] : visibleColumns
  }, [
    categoryNameById,
    formatWriteOffDate,
    i18n.language,
    locationNameById,
    navigate,
    responsibleNameById,
    subcategoryNameById,
    t,
    visibleColumnIds,
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
      { id: archiveTarget.id, currentlyArchived: archiveTarget.archived, userEmail },
      {
        onSuccess: () => {
          setArchiveTarget(null)
        },
      },
    )
  }

  const skeletonColumnCount = visibleColumnIds.length + 1
  const skeletonColumnClassNames = [
    ...visibleColumnIds.map((id): string => {
      if (id === "photo") {
        return "size-10"
      }
      if (id === "name") {
        return "h-4 w-32"
      }
      if (id === "quantity" || id === "inventoryNumberId" || id === "price") {
        return "h-4 w-10"
      }
      return "h-4 w-24"
    }),
    "size-8",
  ]

  const openCreate = () => setCreateOpen(true)

  const hasActiveFilters =
    Boolean(search) ||
    categoryFilter !== "all" ||
    subcategoryFilter !== "all" ||
    availabilityFilter !== "all" ||
    locationFilter !== "all" ||
    responsibleFilter !== "all" ||
    conditionFilter !== "all" ||
    showArchived ||
    showWrittenOff ||
    !isDefaultInventorySorting(sorting)

  const clearAllFilters = () => {
    setSorting([...DEFAULT_INVENTORY_SORTING])
    setSearch(DEFAULT_INVENTORY_TABLE_VIEW.search)
    setCategoryFilter(DEFAULT_INVENTORY_TABLE_VIEW.categoryFilter)
    setSubcategoryFilter(DEFAULT_INVENTORY_TABLE_VIEW.subcategoryFilter)
    setAvailabilityFilter(DEFAULT_INVENTORY_TABLE_VIEW.availabilityFilter)
    setLocationFilter(DEFAULT_INVENTORY_TABLE_VIEW.locationFilter)
    setResponsibleFilter(DEFAULT_INVENTORY_TABLE_VIEW.responsibleFilter)
    setConditionFilter(DEFAULT_INVENTORY_TABLE_VIEW.conditionFilter)
    setShowArchived(DEFAULT_INVENTORY_TABLE_VIEW.showArchived)
    setShowWrittenOff(DEFAULT_INVENTORY_TABLE_VIEW.showWrittenOff)
    if (locationSearch) {
      navigate("/inventory", { replace: true })
    }
  }

  const runExport = async (format: "xlsx" | "pdf") => {
    const exportOptions = {
      includeWriteOffColumns: showWrittenOff,
      visibleColumnIds,
    }
    const sortedItems = table.getRowModel().rows.map((row) => row.original)
    const exportItems =
      showWrittenOff || showArchived
        ? sortedItems
        : sortedItems.filter((item) => !item.removed && !item.archived)
    if (exportItems.length === 0) {
      window.alert(t("inventory.export.empty"))
      return
    }
    if (format === "xlsx") {
      exportToXlsx(
        prepareExportData(
          exportItems,
          categories,
          subcategories,
          locations,
          responsibles,
          t,
          exportOptions,
        ),
        t,
        exportOptions,
      )
      return
    }
    await exportToPdf(
      exportItems,
      categories,
      subcategories,
      locations,
      responsibles,
      t,
      exportOptions,
    )
  }

  const isStorageEmpty = items.length === 0
  const isFilterEmpty = !isStorageEmpty && filteredItems.length === 0

  const handleSaveColumnPrefs = (nextPrefs: InventoryColumnPrefs) => {
    setColumnPrefs(nextPrefs)
    saveInventoryColumnPrefs(nextPrefs)
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 bg-background px-[15px] py-[10px]">
      <div
        ref={filterHeaderSentinelRef}
        className="pointer-events-none hidden h-px w-full shrink-0 md:block"
        aria-hidden
      />
      <div
        className={cn(
          "flex flex-col gap-3 md:sticky md:top-0 md:z-10 md:bg-background md:pb-4 md:transition-shadow md:duration-200",
          filterHeaderScrolled && "md:shadow-[0_6px_8px_-6px_hsl(var(--foreground)/0.08)]",
        )}
      >
        <div className="flex flex-wrap items-center justify-end gap-2 md:justify-between">
          <div className="hidden min-w-0 flex-1 md:block md:max-w-sm">
            <InventorySearchInput
              id="inventory-search"
              inputRef={desktopSearchRef}
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
                      onClick={(event) => {
                        event.currentTarget.blur()
                        setColumnSettingsOpen(true)
                      }}
                    >
                      <SlidersHorizontal className="size-4" />
                      {t("inventory.columnSettings.open")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("inventory.columnSettings.openTooltip")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
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

        <div className="flex flex-col gap-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:gap-2">
          <div className="grid grid-cols-3 items-end gap-2 md:contents">
            <div className="flex min-w-0 flex-col gap-1.5 md:hidden">
              <Label htmlFor="inventory-search-mobile" className="truncate">
                {t("inventory.searchPlaceholder")}
              </Label>
              <InventorySearchInput
                id="inventory-search-mobile"
                inputRef={mobileSearchRef}
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
                  disabled={lookupsLoading}
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
                        lookupsLoading ? t("common.loading") : t("inventory.filters.all")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                    {categoryFilterOptions.map((category) => (
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
                    disabled={categoryFilter === "all" || lookupsLoading}
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
                          lookupsLoading ? t("common.loading") : t("inventory.filters.all")
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

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 md:contents">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="inventory-filter-availability" className="truncate">
                {t("inventory.filters.availability")}
              </Label>
              <div className="relative min-w-0">
                <Select value={availabilityFilter} onValueChange={applyAvailabilityFilter}>
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
                  onClear={() => applyAvailabilityFilter("all")}
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
                  disabled={lookupsLoading}
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
                        lookupsLoading ? t("common.loading") : t("inventory.filters.all")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                    {locationFilterOptions.map((location) => (
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
              <Label htmlFor="inventory-filter-responsible" className="truncate">
                {t("inventory.filters.responsible")}
              </Label>
              <div className="relative min-w-0">
                <Select
                  value={responsibleFilter}
                  onValueChange={setResponsibleFilter}
                  disabled={lookupsLoading}
                >
                  <SelectTrigger
                    id="inventory-filter-responsible"
                    className={cn(
                      "h-9 w-full min-w-0",
                      responsibleFilter !== "all" && "pr-8 [&>svg]:hidden",
                    )}
                  >
                    <SelectValue
                      placeholder={
                        lookupsLoading ? t("common.loading") : t("inventory.filters.all")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("inventory.filters.all")}</SelectItem>
                    {responsibleFilterOptions.map((responsible) => (
                      <SelectItem key={responsible.id} value={responsible.id}>
                        {responsible.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FilterClearButton
                  visible={responsibleFilter !== "all"}
                  label={t("inventory.filters.clear")}
                  className="right-2"
                  onClear={() => setResponsibleFilter("all")}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="inventory-filter-condition" className="truncate">
                {t("inventory.filters.condition")}
              </Label>
              <div className="relative min-w-0">
                <Select value={conditionFilter} onValueChange={applyConditionFilter}>
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
                  onClear={() => applyConditionFilter("all")}
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

      <InventoryColumnSettingsDialog
        open={columnSettingsOpen}
        prefs={columnPrefs}
        onOpenChange={setColumnSettingsOpen}
        onSave={handleSaveColumnPrefs}
      />

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
        <MotionDialogContent
          open={createOpen}
          className="gap-0 p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-1.5 border-b bg-background px-6 py-4 pr-12 text-left">
            <DialogTitle>{t("inventory.addItem")}</DialogTitle>
            <DialogDescription>{t("inventory.form.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <InventoryItemForm
              id="inventory-item-create-form"
              mode="create"
              autoFocusFirstField
              onDirtyChange={setCreateFormDirty}
              onCancel={requestCloseCreate}
              onSubmit={(data) => {
                createItemMutation.mutate(
                  { data, userEmail },
                  {
                    onSuccess: () => {
                      setCreateFormDirty(false)
                      setCreateOpen(false)
                    },
                  },
                )
              }}
            />
          </div>
        </MotionDialogContent>
      </Dialog>

      <Dialog open={discardCreateOpen} onOpenChange={setDiscardCreateOpen}>
        <MotionDialogContent
          open={discardCreateOpen}
          className="z-[70] max-w-sm"
          closeOnBackdropClick={false}
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

      <NeedsRepairDialog
        item={needsRepairTarget}
        open={needsRepairTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNeedsRepairTarget(null)
          }
        }}
        onConfirm={() => {
          setNeedsRepairTarget(null)
        }}
      />

      <RepairedConfirmDialog
        item={repairedConfirmTarget}
        open={repairedConfirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRepairedConfirmTarget(null)
          }
        }}
        onConfirm={() => {
          setRepairedConfirmTarget(null)
        }}
      />

      <BorrowDialog
        item={borrowTarget}
        open={borrowTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBorrowTarget(null)
          }
        }}
        onConfirm={() => {
          setBorrowTarget(null)
        }}
      />

      <ReturnBorrowedDialog
        item={returnBorrowedTarget}
        open={returnBorrowedTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReturnBorrowedTarget(null)
          }
        }}
        onConfirm={() => {
          setReturnBorrowedTarget(null)
        }}
      />
    </main>
  )
}
