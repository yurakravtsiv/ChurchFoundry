import type { TFunction } from "i18next"

import {
  getDefaultColumnPrefs,
  getSearchableColumnIds,
  type InventoryColumnId,
} from "@/lib/inventoryColumnConfig"
import { availabilityLabel, conditionLabel } from "@/lib/inventoryLabels"
import type { Category, InventoryItem, Location, Subcategory } from "@/types/inventory"

function getColumnSearchValues(
  columnId: InventoryColumnId,
  item: InventoryItem,
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
  t: TFunction,
): string[] {
  switch (columnId) {
    case "photo":
    case "inventoryNumberId":
      return []
    case "name":
      return [item.name]
    case "category":
      return [categories.find((category) => category.id === item.categoryId)?.name ?? ""]
    case "subcategory":
      return [
        subcategories.find((subcategory) => subcategory.id === item.subcategoryId)?.name ?? "",
      ]
    case "quantity":
      return [String(item.quantity)]
    case "location":
      return [locations.find((location) => location.id === item.locationId)?.name ?? ""]
    case "condition":
      return [conditionLabel(item.condition, t)]
    case "repairDate":
      return [item.repairDate ?? ""]
    case "repairComment":
      return [item.repairComment ?? ""]
    case "availability":
      return [availabilityLabel(item.availability, t)]
    case "borrowDate":
      return [item.borrowDate ?? ""]
    case "writeOffDate":
      return [item.writeOffDate ?? ""]
    case "writeOffReason":
      return [item.writeOffReason ?? ""]
    case "availabilityComment":
      return [item.availabilityComment]
    case "supplier":
      return [item.supplier]
    case "price":
      return [item.price != null ? String(item.price) : ""]
    case "serialNumber":
      return [item.serialNumber]
    case "warrantyUntil":
      return [item.warrantyUntil ?? ""]
    case "comment":
      return [item.comment]
  }
}

/**
 * User-facing textual values that inventory search should match, limited to
 * currently searchable (visible / enabled) columns.
 * When adding a field to InventoryItem, add a column mapping here as well —
 * see .cursor/rules/inventory-search-fields.mdc.
 *
 * Explicitly excluded: inventoryNumberId (sequential id; not searchable by product rule).
 */
export function getInventoryItemSearchableValues(
  item: InventoryItem,
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
  t: TFunction,
  searchableColumnIds: readonly InventoryColumnId[] = getSearchableColumnIds(
    getDefaultColumnPrefs(),
  ),
): string[] {
  return searchableColumnIds.flatMap((columnId) =>
    getColumnSearchValues(columnId, item, categories, subcategories, locations, t),
  )
}

export function itemMatchesSearch(
  item: InventoryItem,
  query: string,
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
  t: TFunction,
  searchableColumnIds?: readonly InventoryColumnId[],
): boolean {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) {
    return true
  }

  return getInventoryItemSearchableValues(
    item,
    categories,
    subcategories,
    locations,
    t,
    searchableColumnIds,
  ).some((value) => value.toLowerCase().includes(normalizedQuery))
}
