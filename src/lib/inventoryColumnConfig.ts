export const INVENTORY_COLUMN_IDS = [
  "photo",
  "inventoryNumberId",
  "name",
  "category",
  "subcategory",
  "quantity",
  "location",
  "responsible",
  "condition",
  "repairDate",
  "repairComment",
  "availability",
  "borrowDate",
  "returnDate",
  "writeOffDate",
  "writeOffReason",
  "availabilityComment",
  "supplier",
  "price",
  "serialNumber",
  "warrantyUntil",
  "comment",
] as const

export type InventoryColumnId = (typeof INVENTORY_COLUMN_IDS)[number]

/** Data columns that can appear in XLSX / PDF body cells (photo is PDF-only). */
export type InventoryExportRowKey = Exclude<InventoryColumnId, "photo">

export type InventoryColumnContext = {
  hasRepairItems: boolean
  hasBorrowedItems: boolean
  showWrittenOff: boolean
}

type ContextualKey = "repair" | "borrow" | "writeOff"

export type InventoryColumnDefinition = {
  id: InventoryColumnId
  defaultVisible: boolean
  required?: boolean
  contextual?: ContextualKey
}

export const INVENTORY_COLUMN_DEFINITIONS: readonly InventoryColumnDefinition[] = [
  { id: "photo", defaultVisible: true },
  { id: "inventoryNumberId", defaultVisible: false },
  { id: "name", defaultVisible: true, required: true },
  { id: "category", defaultVisible: true },
  { id: "subcategory", defaultVisible: true },
  { id: "quantity", defaultVisible: true },
  { id: "location", defaultVisible: true },
  { id: "responsible", defaultVisible: true },
  { id: "condition", defaultVisible: true },
  { id: "repairDate", defaultVisible: true, contextual: "repair" },
  { id: "repairComment", defaultVisible: true, contextual: "repair" },
  { id: "availability", defaultVisible: true },
  { id: "borrowDate", defaultVisible: true, contextual: "borrow" },
  { id: "returnDate", defaultVisible: true, contextual: "borrow" },
  { id: "writeOffDate", defaultVisible: true, contextual: "writeOff" },
  { id: "writeOffReason", defaultVisible: true, contextual: "writeOff" },
  { id: "availabilityComment", defaultVisible: true },
  { id: "supplier", defaultVisible: false },
  { id: "price", defaultVisible: false },
  { id: "serialNumber", defaultVisible: false },
  { id: "warrantyUntil", defaultVisible: false },
  { id: "comment", defaultVisible: true },
]

export const INVENTORY_COLUMN_DEFINITION_BY_ID: Record<
  InventoryColumnId,
  InventoryColumnDefinition
> = Object.fromEntries(
  INVENTORY_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<InventoryColumnId, InventoryColumnDefinition>

const COLUMN_ID_SET = new Set<string>(INVENTORY_COLUMN_IDS)

const NON_SEARCHABLE_COLUMN_IDS = new Set<InventoryColumnId>(["photo", "inventoryNumberId"])

export type InventoryColumnPrefs = {
  version: 1
  order: InventoryColumnId[]
  hidden: InventoryColumnId[]
}

export function isInventoryColumnId(value: unknown): value is InventoryColumnId {
  return typeof value === "string" && COLUMN_ID_SET.has(value)
}

export function getDefaultHiddenColumnIds(): InventoryColumnId[] {
  return INVENTORY_COLUMN_DEFINITIONS.filter((definition) => !definition.defaultVisible).map(
    (definition) => definition.id,
  )
}

export function getDefaultColumnPrefs(): InventoryColumnPrefs {
  return {
    version: 1,
    order: [...INVENTORY_COLUMN_IDS],
    hidden: getDefaultHiddenColumnIds(),
  }
}

/** Insert newly registered columns at their default neighbor when possible. */
function insertAppendedColumnIds(
  savedOrder: InventoryColumnId[],
  appended: readonly InventoryColumnId[],
): InventoryColumnId[] {
  const order = [...savedOrder]
  for (const id of appended) {
    if (id === "responsible") {
      const locationIndex = order.indexOf("location")
      if (locationIndex !== -1) {
        order.splice(locationIndex + 1, 0, id)
        continue
      }
    }
    if (id === "returnDate") {
      const borrowDateIndex = order.indexOf("borrowDate")
      if (borrowDateIndex !== -1) {
        order.splice(borrowDateIndex + 1, 0, id)
        continue
      }
    }
    order.push(id)
  }
  return order
}

function uniqueColumnIds(values: unknown[]): InventoryColumnId[] {
  const seen = new Set<InventoryColumnId>()
  const ids: InventoryColumnId[] = []
  for (const value of values) {
    if (!isInventoryColumnId(value) || seen.has(value)) {
      continue
    }
    seen.add(value)
    ids.push(value)
  }
  return ids
}

/**
 * Merge stored prefs with the current column registry: drop unknown ids,
 * append newly added columns at the end with their default visibility.
 */
export function mergeColumnPrefs(stored: unknown): InventoryColumnPrefs {
  const defaults = getDefaultColumnPrefs()
  if (!stored || typeof stored !== "object") {
    return defaults
  }

  const record = stored as Record<string, unknown>
  if (!Array.isArray(record.order)) {
    return defaults
  }

  const savedOrder = uniqueColumnIds(record.order)
  const savedOrderSet = new Set(savedOrder)
  const appended = INVENTORY_COLUMN_IDS.filter((id) => !savedOrderSet.has(id))
  const order = insertAppendedColumnIds(savedOrder, appended)

  const hidden = new Set<InventoryColumnId>()
  if (Array.isArray(record.hidden)) {
    for (const value of record.hidden) {
      if (isInventoryColumnId(value)) {
        hidden.add(value)
      }
    }
  } else {
    for (const id of defaults.hidden) {
      hidden.add(id)
    }
  }

  for (const id of appended) {
    const definition = INVENTORY_COLUMN_DEFINITION_BY_ID[id]
    if (definition.defaultVisible) {
      hidden.delete(id)
    } else {
      hidden.add(id)
    }
  }

  hidden.delete("name")

  return { version: 1, order, hidden: [...hidden] }
}

export function isDefaultColumnPrefs(prefs: InventoryColumnPrefs): boolean {
  const defaults = getDefaultColumnPrefs()
  if (prefs.order.length !== defaults.order.length) {
    return false
  }
  if (prefs.order.some((id, index) => id !== defaults.order[index])) {
    return false
  }
  const hiddenA = [...prefs.hidden].sort().join(",")
  const hiddenB = [...defaults.hidden].sort().join(",")
  return hiddenA === hiddenB
}

export function isColumnAvailable(id: InventoryColumnId, context: InventoryColumnContext): boolean {
  const contextual = INVENTORY_COLUMN_DEFINITION_BY_ID[id].contextual
  if (contextual === "repair") {
    return context.hasRepairItems
  }
  if (contextual === "borrow") {
    return context.hasBorrowedItems
  }
  if (contextual === "writeOff") {
    return context.showWrittenOff
  }
  return true
}

/** Visible table/export columns in user order, excluding the actions column. */
export function resolveVisibleColumnIds(
  prefs: InventoryColumnPrefs,
  context: InventoryColumnContext,
): InventoryColumnId[] {
  const hidden = new Set(prefs.hidden)
  hidden.delete("name")
  return prefs.order.filter((id) => !hidden.has(id) && isColumnAvailable(id, context))
}

/**
 * Columns that participate in text search. Contextual columns stay searchable
 * when enabled in prefs even if they are not currently rendered.
 */
export function getSearchableColumnIds(prefs: InventoryColumnPrefs): InventoryColumnId[] {
  const hidden = new Set(prefs.hidden)
  hidden.delete("name")
  return prefs.order.filter((id) => !hidden.has(id) && !NON_SEARCHABLE_COLUMN_IDS.has(id))
}

export function getExportDataColumnIds(
  visibleColumnIds: readonly InventoryColumnId[],
): InventoryExportRowKey[] {
  return visibleColumnIds.filter((id): id is InventoryExportRowKey => id !== "photo")
}
