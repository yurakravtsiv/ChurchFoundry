import type { TFunction } from "i18next"

import { availabilityLabel, conditionLabel } from "@/lib/inventoryLabels"
import type { Category, InventoryItem, Location, Subcategory } from "@/types/inventory"

/**
 * All user-facing / textual values that inventory search should match.
 * When adding a field to InventoryItem (or a displayed derived value),
 * add it here as well — see .cursor/rules/inventory-search-fields.mdc.
 *
 * Explicitly excluded: inventoryNumberId (sequential id; not searchable by product rule).
 */
export function getInventoryItemSearchableValues(
  item: InventoryItem,
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
  t: TFunction,
): string[] {
  return [
    item.id,
    item.name,
    String(item.quantity),
    item.price != null ? String(item.price) : "",
    item.availabilityComment,
    item.borrowDate ?? "",
    item.supplier,
    item.serialNumber,
    item.comment,
    item.writeOffReason ?? "",
    item.repairComment ?? "",
    item.warrantyUntil ?? "",
    item.qrCodeValue,
    item.createdAt,
    item.updatedAt,
    categories.find((category) => category.id === item.categoryId)?.name ?? "",
    subcategories.find((subcategory) => subcategory.id === item.subcategoryId)?.name ?? "",
    locations.find((location) => location.id === item.locationId)?.name ?? "",
    conditionLabel(item.condition, t),
    availabilityLabel(item.availability, t),
  ]
}

export function itemMatchesSearch(
  item: InventoryItem,
  query: string,
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
  t: TFunction,
): boolean {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) {
    return true
  }

  return getInventoryItemSearchableValues(item, categories, subcategories, locations, t).some(
    (value) => value.toLowerCase().includes(normalizedQuery),
  )
}
