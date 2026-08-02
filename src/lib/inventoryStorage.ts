import { filterVisible, isVisible } from "@/lib/removedEntity"
import type {
  Category,
  CreateInventoryItemInput,
  InventoryItem,
  ItemCondition,
  Location,
  Subcategory,
  UpdateInventoryItemInput,
} from "@/types/inventory"

const ITEM_CONDITIONS: ItemCondition[] = ["good", "needs_repair", "written_off"]

const CATEGORIES_KEY = "churchfoundry:categories"
const SUBCATEGORIES_KEY = "churchfoundry:subcategories"
const LOCATIONS_KEY = "churchfoundry:locations"
const INVENTORY_ITEMS_KEY = "churchfoundry:inventory-items"

const IMAGE_MAX_SIDE_PX = 800
const IMAGE_JPEG_QUALITY = 0.8

function newId() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

function readJsonArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch (error) {
    console.error(`[inventoryStorage] Failed to read ${key}`, error)
    return []
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[inventoryStorage] Failed to write ${key}`, error)
    return false
  }
}

function normalizeRemovedFlag<T extends { removed?: boolean }>(
  entity: T,
): T & { removed: boolean } {
  if (typeof entity.removed === "boolean") {
    return entity as T & { removed: boolean }
  }
  return { ...entity, removed: false }
}

function normalizeEntityList<T extends { removed?: boolean }>(
  key: string,
  entities: T[],
): Array<T & { removed: boolean }> {
  let dirty = false
  const normalized = entities.map((entity) => {
    const next = normalizeRemovedFlag(entity)
    if (next !== entity) {
      dirty = true
    }
    return next
  })
  if (dirty) {
    writeJson(key, normalized)
  }
  return normalized
}

export function getCategories(): Category[] {
  return normalizeEntityList(CATEGORIES_KEY, readJsonArray<Category>(CATEGORIES_KEY))
}

export function saveCategories(categories: Category[]): void {
  writeJson(CATEGORIES_KEY, categories)
}

export function getSubcategories(): Subcategory[] {
  return normalizeEntityList(SUBCATEGORIES_KEY, readJsonArray<Subcategory>(SUBCATEGORIES_KEY))
}

export function saveSubcategories(subcategories: Subcategory[]): void {
  writeJson(SUBCATEGORIES_KEY, subcategories)
}

export function getLocations(): Location[] {
  return normalizeEntityList(LOCATIONS_KEY, readJsonArray<Location>(LOCATIONS_KEY))
}

export function saveLocations(locations: Location[]): void {
  writeJson(LOCATIONS_KEY, locations)
}

/** Migrates legacy `location: string` items to `locationId` + locations list. */
function migrateLegacyLocationFields(): void {
  const raw = readJsonArray<Record<string, unknown>>(INVENTORY_ITEMS_KEY)
  const needsMigration = raw.some(
    (item) => "location" in item || typeof item.locationId !== "string",
  )
  if (!needsMigration) {
    return
  }

  let locations = getLocations()
  const nameToId = new Map(locations.map((location) => [location.name.toLowerCase(), location.id]))

  const migrated = raw.map((item) => {
    const existingId = typeof item.locationId === "string" ? item.locationId : ""
    if (existingId) {
      const { location: _legacyLocation, ...rest } = item
      return { ...rest, locationId: existingId }
    }

    const locationName = typeof item.location === "string" ? item.location.trim() : ""
    let locationId = ""
    if (locationName) {
      const key = locationName.toLowerCase()
      let id = nameToId.get(key)
      if (!id) {
        const created: Location = { id: newId(), name: locationName, removed: false }
        locations = [...locations, created]
        nameToId.set(key, created.id)
        id = created.id
      }
      locationId = id
    }

    const { location: _legacyLocation, ...rest } = item
    return { ...rest, locationId }
  })

  saveLocations(locations)
  writeJson(INVENTORY_ITEMS_KEY, migrated)
}

function isValidInventoryNumberId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
}

function maxInventoryNumberId(items: InventoryItem[]): number {
  let max = 0
  for (const item of items) {
    if (isValidInventoryNumberId(item.inventoryNumberId) && item.inventoryNumberId > max) {
      max = item.inventoryNumberId
    }
  }
  return max
}

/** Assigns sequential inventoryNumberId to legacy items missing a valid number. */
function assignMissingInventoryNumberIds(items: InventoryItem[]): {
  items: InventoryItem[]
  dirty: boolean
} {
  const needingIndexes = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isValidInventoryNumberId(item.inventoryNumberId))
    .sort((a, b) => {
      const byCreatedAt = a.item.createdAt.localeCompare(b.item.createdAt)
      if (byCreatedAt !== 0) {
        return byCreatedAt
      }
      return a.index - b.index
    })

  if (needingIndexes.length === 0) {
    return { items, dirty: false }
  }

  let nextNumber = maxInventoryNumberId(items)
  const next = [...items]
  for (const { index } of needingIndexes) {
    nextNumber += 1
    next[index] = { ...next[index], inventoryNumberId: nextNumber }
  }
  return { items: next, dirty: true }
}

function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  let next = item
  if (!(typeof item.price === "number" && Number.isFinite(item.price)) && item.price !== null) {
    next = { ...next, price: null }
  }
  if (typeof next.removed !== "boolean") {
    next = { ...next, removed: false }
  }
  if (!ITEM_CONDITIONS.includes(next.condition)) {
    next = { ...next, condition: "good" }
  }
  if (typeof next.writeOffDate !== "string" && next.writeOffDate !== null) {
    next = { ...next, writeOffDate: null }
  }
  if (typeof next.writeOffReason !== "string" && next.writeOffReason !== null) {
    next = { ...next, writeOffReason: null }
  }
  if (typeof next.originalItemId !== "string" && next.originalItemId !== null) {
    next = { ...next, originalItemId: null }
  }
  return next
}

/**
 * Internal: all inventory rows including soft-deleted (`removed === true`).
 * For mutations only — never use this from UI code.
 */
function getAllInventoryItemsRaw(): InventoryItem[] {
  migrateLegacyLocationFields()
  const items = readJsonArray<InventoryItem>(INVENTORY_ITEMS_KEY)
  let dirty = false
  let normalized = items.map((item) => {
    const next = normalizeInventoryItem(item)
    if (next !== item) {
      dirty = true
    }
    return next
  })
  const withNumbers = assignMissingInventoryNumberIds(normalized)
  normalized = withNumbers.items
  if (withNumbers.dirty) {
    dirty = true
  }
  if (dirty) {
    writeJson(INVENTORY_ITEMS_KEY, normalized)
  }
  return normalized
}

/** Visible inventory items only (`removed !== true`). */
export function getInventoryItems(): InventoryItem[] {
  return filterVisible(getAllInventoryItemsRaw())
}

export function saveInventoryItems(items: InventoryItem[]): void {
  writeJson(INVENTORY_ITEMS_KEY, items)
}

export function createCategory(name: string): Category {
  const category: Category = { id: newId(), name: name.trim(), removed: false }
  const next = [...getCategories(), category]
  saveCategories(next)
  return category
}

export function createSubcategory(categoryId: string, name: string): Subcategory {
  const subcategory: Subcategory = {
    id: newId(),
    categoryId,
    name: name.trim(),
    removed: false,
  }
  const next = [...getSubcategories(), subcategory]
  saveSubcategories(next)
  return subcategory
}

export function createLocation(name: string): Location {
  const location: Location = { id: newId(), name: name.trim(), removed: false }
  const next = [...getLocations(), location]
  saveLocations(next)
  return location
}

/** Видаляє категорію і всі її підкатегорії каскадно. */
export function deleteCategory(id: string): void {
  saveCategories(getCategories().filter((category) => category.id !== id))
  saveSubcategories(getSubcategories().filter((subcategory) => subcategory.categoryId !== id))
}

export function createInventoryItem(data: CreateInventoryItemInput): InventoryItem {
  const id = newId()
  const timestamp = nowIso()
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const existingItems = getAllInventoryItemsRaw()
  const item: InventoryItem = {
    ...data,
    price: data.price ?? null,
    condition: data.condition ?? "good",
    id,
    inventoryNumberId: maxInventoryNumberId(existingItems) + 1,
    qrCodeValue: `${origin}/inventory/${id}`,
    archived: false,
    removed: false,
    writeOffDate: null,
    writeOffReason: null,
    originalItemId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  saveInventoryItems([...existingItems, item])
  return item
}

export function updateInventoryItem(
  id: string,
  data: UpdateInventoryItemInput,
): InventoryItem | undefined {
  const items = getAllInventoryItemsRaw()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1 || !isVisible(items[index])) {
    return undefined
  }

  const updated: InventoryItem = {
    ...items[index],
    ...data,
    id,
    inventoryNumberId: items[index].inventoryNumberId,
    createdAt: items[index].createdAt,
    qrCodeValue: items[index].qrCodeValue,
    updatedAt: nowIso(),
  }
  const next = [...items]
  next[index] = updated
  saveInventoryItems(next)
  return updated
}

export function archiveInventoryItem(id: string): InventoryItem | undefined {
  return updateInventoryItem(id, { archived: true })
}

export function unarchiveInventoryItem(id: string): InventoryItem | undefined {
  return updateInventoryItem(id, { archived: false })
}

export function getInventoryItemById(id: string): InventoryItem | undefined {
  const item = getAllInventoryItemsRaw().find((entry) => entry.id === id)
  if (!item || !isVisible(item)) {
    return undefined
  }
  return item
}

/**
 * Splits quantity from an active item into a new written-off item.
 * If the original quantity becomes 0, the original is soft-deleted (`removed: true`).
 */
export function writeOffItem(
  originalItemId: string,
  quantityToWriteOff: number,
  writeOffDate: string,
  writeOffReason: string,
): { updatedOriginal: InventoryItem; newWrittenOffItem: InventoryItem } {
  const items = getAllInventoryItemsRaw()
  const originalIndex = items.findIndex((item) => item.id === originalItemId)
  if (originalIndex === -1) {
    throw new Error(`[inventoryStorage] writeOffItem: item not found (${originalItemId})`)
  }

  const original = items[originalIndex]
  if (!Number.isFinite(quantityToWriteOff) || quantityToWriteOff <= 0) {
    throw new Error("[inventoryStorage] writeOffItem: quantityToWriteOff must be > 0")
  }
  if (quantityToWriteOff > original.quantity) {
    throw new Error(
      `[inventoryStorage] writeOffItem: quantityToWriteOff (${quantityToWriteOff}) exceeds available quantity (${original.quantity})`,
    )
  }

  const timestamp = nowIso()
  const newQuantity = original.quantity - quantityToWriteOff
  const updatedOriginal: InventoryItem = {
    ...original,
    quantity: newQuantity,
    removed: newQuantity === 0 ? true : original.removed,
    updatedAt: timestamp,
  }

  const newIdValue = newId()
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const newWrittenOffItem: InventoryItem = {
    ...original,
    id: newIdValue,
    quantity: quantityToWriteOff,
    condition: "written_off",
    writeOffDate,
    writeOffReason,
    originalItemId: original.id,
    qrCodeValue: `${origin}/inventory/${newIdValue}`,
    removed: false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const next = [...items]
  next[originalIndex] = updatedOriginal
  next.push(newWrittenOffItem)
  saveInventoryItems(next)

  return { updatedOriginal, newWrittenOffItem }
}

/**
 * Returns a written-off split item back into its original stock.
 * Soft-deletes the written-off row and restores the original (`removed: false`).
 */
export function returnToStock(writtenOffItemId: string): {
  updatedOriginal: InventoryItem
  removedWrittenOffItem: InventoryItem
} {
  const items = getAllInventoryItemsRaw()
  const writtenOffIndex = items.findIndex((item) => item.id === writtenOffItemId)
  if (writtenOffIndex === -1) {
    throw new Error(`[inventoryStorage] returnToStock: item not found (${writtenOffItemId})`)
  }

  const writtenOffItem = items[writtenOffIndex]
  if (writtenOffItem.condition !== "written_off" || !writtenOffItem.originalItemId) {
    throw new Error(
      `[inventoryStorage] returnToStock: item is not a written-off split (${writtenOffItemId})`,
    )
  }

  const originalIndex = items.findIndex((item) => item.id === writtenOffItem.originalItemId)
  if (originalIndex === -1) {
    throw new Error(
      `[inventoryStorage] returnToStock: original item not found (${writtenOffItem.originalItemId})`,
    )
  }

  const timestamp = nowIso()
  const original = items[originalIndex]
  const updatedOriginal: InventoryItem = {
    ...original,
    quantity: original.quantity + writtenOffItem.quantity,
    removed: false,
    updatedAt: timestamp,
  }
  const removedWrittenOffItem: InventoryItem = {
    ...writtenOffItem,
    removed: true,
    updatedAt: timestamp,
  }

  const next = [...items]
  next[originalIndex] = updatedOriginal
  next[writtenOffIndex] = removedWrittenOffItem
  saveInventoryItems(next)

  return { updatedOriginal, removedWrittenOffItem }
}

/**
 * Стискає зображення через canvas і повертає base64 dataUrl.
 *
 * NOTE: Photos are stored as base64 in localStorage for now. Browsers typically
 * allow only ~5MB per origin — fine for testing, but move images to Supabase
 * Storage before wiring a real backend.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      try {
        const longest = Math.max(image.width, image.height)
        const scale = longest > IMAGE_MAX_SIDE_PX ? IMAGE_MAX_SIDE_PX / longest : 1
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Canvas 2D context unavailable"))
          return
        }

        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", IMAGE_JPEG_QUALITY))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Failed to load image for compression"))
    }

    image.src = objectUrl
  })
}
