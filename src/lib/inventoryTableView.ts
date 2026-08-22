import type { SortingState } from "@tanstack/react-table"

export const INVENTORY_TABLE_VIEW_STORAGE_KEY = "churchfoundry:inventory-table-view"

export const DEFAULT_INVENTORY_SORTING: SortingState = [{ id: "name", desc: false }]

export type InventoryTableViewState = {
  sorting: SortingState
  search: string
  categoryFilter: string
  subcategoryFilter: string
  availabilityFilter: string
  locationFilter: string
  responsibleFilter: string
  conditionFilter: string
  showArchived: boolean
  showWrittenOff: boolean
}

export const DEFAULT_INVENTORY_TABLE_VIEW: InventoryTableViewState = {
  sorting: DEFAULT_INVENTORY_SORTING,
  search: "",
  categoryFilter: "all",
  subcategoryFilter: "all",
  availabilityFilter: "all",
  locationFilter: "all",
  responsibleFilter: "all",
  conditionFilter: "all",
  showArchived: false,
  showWrittenOff: false,
}

function isSortingState(value: unknown): value is SortingState {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as { id?: unknown }).id === "string" &&
        typeof (entry as { desc?: unknown }).desc === "boolean",
    )
  )
}

function asFilterId(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

export function isDefaultInventorySorting(sorting: SortingState): boolean {
  return sorting.length === 1 && sorting[0]?.id === "name" && sorting[0]?.desc === false
}

export function parseInventoryTableView(value: unknown): InventoryTableViewState {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_INVENTORY_TABLE_VIEW, sorting: [...DEFAULT_INVENTORY_SORTING] }
  }

  const raw = value as Partial<InventoryTableViewState>
  return {
    sorting: isSortingState(raw.sorting) ? raw.sorting : [...DEFAULT_INVENTORY_SORTING],
    search: typeof raw.search === "string" ? raw.search : "",
    categoryFilter: asFilterId(raw.categoryFilter, "all"),
    subcategoryFilter: asFilterId(raw.subcategoryFilter, "all"),
    availabilityFilter: asFilterId(raw.availabilityFilter, "all"),
    locationFilter: asFilterId(raw.locationFilter, "all"),
    responsibleFilter: asFilterId(raw.responsibleFilter, "all"),
    conditionFilter: asFilterId(raw.conditionFilter, "all"),
    showArchived: raw.showArchived === true,
    showWrittenOff: raw.showWrittenOff === true,
  }
}

export function loadInventoryTableView(): InventoryTableViewState {
  try {
    const stored = localStorage.getItem(INVENTORY_TABLE_VIEW_STORAGE_KEY)
    if (!stored) {
      return { ...DEFAULT_INVENTORY_TABLE_VIEW, sorting: [...DEFAULT_INVENTORY_SORTING] }
    }
    return parseInventoryTableView(JSON.parse(stored) as unknown)
  } catch (error) {
    console.error("[inventoryTableView] Failed to read table view", error)
    return { ...DEFAULT_INVENTORY_TABLE_VIEW, sorting: [...DEFAULT_INVENTORY_SORTING] }
  }
}

export function saveInventoryTableView(view: InventoryTableViewState): void {
  try {
    localStorage.setItem(INVENTORY_TABLE_VIEW_STORAGE_KEY, JSON.stringify(view))
  } catch (error) {
    console.error("[inventoryTableView] Failed to save table view", error)
  }
}

export function clearInventoryTableView(): void {
  try {
    localStorage.removeItem(INVENTORY_TABLE_VIEW_STORAGE_KEY)
  } catch (error) {
    console.error("[inventoryTableView] Failed to clear table view", error)
  }
}
