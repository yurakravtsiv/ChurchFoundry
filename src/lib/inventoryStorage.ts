import imageCompression from "browser-image-compression"

import { createEvent } from "@/lib/eventsStorage"
import { buildCreatedPayload, buildUpdatedPayloadExcluding } from "@/lib/inventoryEventDiff"
import { filterVisible, isVisible } from "@/lib/removedEntity"
import type {
  MarkedAsBorrowedEventPayload,
  MarkedForRepairEventPayload,
  RepairedEventPayload,
  ReturnedFromBorrowEventPayload,
  ReturnedToStockEventPayload,
  UpdatedEventPayload,
  WrittenOffEventPayload,
} from "@/types/events"
import { EVENT_OBJECT_TYPE } from "@/types/events"
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

function newId() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

function recordInventoryCreated(item: InventoryItem, userEmail: string): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: item.id,
    type: "created",
    userEmail,
    payload: buildCreatedPayload(item),
  })
}

function recordInventoryUpdated(
  before: InventoryItem,
  after: InventoryItem,
  userEmail: string,
): void {
  const payload = buildUpdatedPayloadExcluding(before, after, [])
  if (!payload) {
    return
  }
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: after.id,
    type: "updated",
    userEmail,
    payload,
  })
}

function recordInventoryUpdatedExcludingQuantity(
  before: InventoryItem,
  after: InventoryItem,
  userEmail: string,
): void {
  const payload = buildUpdatedPayloadExcluding(before, after, ["quantity"])
  if (!payload) {
    return
  }
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: after.id,
    type: "updated",
    userEmail,
    payload,
  })
}

function recordWrittenOff(
  originalItemId: string,
  userEmail: string,
  payload: WrittenOffEventPayload,
): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: originalItemId,
    type: "written_off",
    userEmail,
    payload,
  })
}

function recordReturnedToStock(
  originalItemId: string,
  userEmail: string,
  payload: ReturnedToStockEventPayload,
): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: originalItemId,
    type: "returned_to_stock",
    userEmail,
    payload,
  })
}

function recordMarkedForRepair(
  originalItemId: string,
  userEmail: string,
  payload: MarkedForRepairEventPayload,
): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: originalItemId,
    type: "marked_for_repair",
    userEmail,
    payload,
  })
}

function recordRepaired(
  originalItemId: string,
  userEmail: string,
  payload: RepairedEventPayload,
): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: originalItemId,
    type: "repaired",
    userEmail,
    payload,
  })
}

function recordMarkedAsBorrowed(
  originalItemId: string,
  userEmail: string,
  payload: MarkedAsBorrowedEventPayload,
): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: originalItemId,
    type: "marked_as_borrowed",
    userEmail,
    payload,
  })
}

function recordReturnedFromBorrow(
  originalItemId: string,
  userEmail: string,
  payload: ReturnedFromBorrowEventPayload,
): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId: originalItemId,
    type: "returned_from_borrow",
    userEmail,
    payload,
  })
}

function recordInventoryCustomUpdate(
  entityId: string,
  userEmail: string,
  payload: UpdatedEventPayload,
): void {
  createEvent({
    objectId: EVENT_OBJECT_TYPE.INVENTORY_ITEM,
    entityId,
    type: "updated",
    userEmail,
    payload,
  })
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
  if (typeof next.repairDate !== "string" && next.repairDate !== null) {
    next = { ...next, repairDate: null }
  }
  if (typeof next.repairComment !== "string" && next.repairComment !== null) {
    next = { ...next, repairComment: null }
  }
  if (typeof next.borrowDate !== "string" && next.borrowDate !== null) {
    next = { ...next, borrowDate: null }
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

export function createInventoryItem(
  data: CreateInventoryItemInput,
  userEmail: string,
): InventoryItem {
  const id = newId()
  const timestamp = nowIso()
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const existingItems = getAllInventoryItemsRaw()
  const item: InventoryItem = {
    ...data,
    price: data.price ?? null,
    condition: "good",
    id,
    inventoryNumberId: maxInventoryNumberId(existingItems) + 1,
    qrCodeValue: `${origin}/inventory/${id}`,
    archived: false,
    removed: false,
    writeOffDate: null,
    writeOffReason: null,
    originalItemId: null,
    repairDate: null,
    repairComment: null,
    borrowDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  saveInventoryItems([...existingItems, item])
  recordInventoryCreated(item, userEmail)
  return item
}

export function updateInventoryItem(
  id: string,
  data: UpdateInventoryItemInput,
  userEmail: string,
): InventoryItem | undefined {
  const items = getAllInventoryItemsRaw()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1 || !isVisible(items[index])) {
    return undefined
  }

  const before = items[index]
  const updated: InventoryItem = {
    ...before,
    ...data,
    id,
    inventoryNumberId: before.inventoryNumberId,
    createdAt: before.createdAt,
    qrCodeValue: before.qrCodeValue,
    updatedAt: nowIso(),
  }
  const next = [...items]
  next[index] = updated
  saveInventoryItems(next)
  recordInventoryUpdated(before, updated, userEmail)
  return updated
}

export function archiveInventoryItem(id: string, userEmail: string): InventoryItem | undefined {
  const items = getAllInventoryItemsRaw()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1 || !isVisible(items[index])) {
    return undefined
  }

  const before = items[index]
  if (before.archived) {
    return before
  }

  const updated: InventoryItem = {
    ...before,
    archived: true,
    updatedAt: nowIso(),
  }
  const next = [...items]
  next[index] = updated
  saveInventoryItems(next)
  recordInventoryCustomUpdate(id, userEmail, { archived: { old: false, new: true } })
  return updated
}

export function unarchiveInventoryItem(id: string, userEmail: string): InventoryItem | undefined {
  const items = getAllInventoryItemsRaw()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1 || !isVisible(items[index])) {
    return undefined
  }

  const before = items[index]
  if (!before.archived) {
    return before
  }

  const updated: InventoryItem = {
    ...before,
    archived: false,
    updatedAt: nowIso(),
  }
  const next = [...items]
  next[index] = updated
  saveInventoryItems(next)
  recordInventoryCustomUpdate(id, userEmail, { archived: { old: true, new: false } })
  return updated
}

export function getInventoryItemById(id: string): InventoryItem | undefined {
  const item = getAllInventoryItemsRaw().find((entry) => entry.id === id)
  if (!item || !isVisible(item)) {
    return undefined
  }
  return item
}

/** Active (not soft-deleted) write-off splits linked to an original item. */
export function getActiveWriteOffsForOriginal(originalItemId: string): InventoryItem[] {
  return getAllInventoryItemsRaw().filter(
    (item) => item.originalItemId === originalItemId && item.removed !== true,
  )
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
  userEmail: string,
): { updatedOriginal: InventoryItem; newWrittenOffItem: InventoryItem } {
  const items = getAllInventoryItemsRaw()
  const originalIndex = items.findIndex((item) => item.id === originalItemId)
  if (originalIndex === -1) {
    throw new Error(`[inventoryStorage] writeOffItem: item not found (${originalItemId})`)
  }

  const original = items[originalIndex]
  if (original.archived) {
    throw new Error(
      `[inventoryStorage] writeOffItem: archived item cannot be written off (${originalItemId})`,
    )
  }
  if (original.condition === "needs_repair") {
    throw new Error(
      `[inventoryStorage] writeOffItem: item needing repair cannot be written off (${originalItemId})`,
    )
  }
  if (original.availability === "borrowed") {
    throw new Error(
      `[inventoryStorage] writeOffItem: borrowed item cannot be written off (${originalItemId})`,
    )
  }
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
    repairDate: null,
    repairComment: null,
    borrowDate: null,
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

  recordInventoryUpdatedExcludingQuantity(original, updatedOriginal, userEmail)
  recordWrittenOff(original.id, userEmail, {
    quantity: quantityToWriteOff,
    writeOffDate,
    writeOffReason,
    relatedItemId: newWrittenOffItem.id,
  })
  recordInventoryCreated(newWrittenOffItem, userEmail)

  return { updatedOriginal, newWrittenOffItem }
}

/**
 * Returns a written-off split item back into its original stock.
 * Soft-deletes the written-off row and restores the original (`removed: false`).
 */
export function returnToStock(
  writtenOffItemId: string,
  userEmail: string,
): {
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

  recordInventoryUpdatedExcludingQuantity(original, updatedOriginal, userEmail)
  recordReturnedToStock(original.id, userEmail, {
    quantity: writtenOffItem.quantity,
    relatedItemId: writtenOffItemId,
  })

  return { updatedOriginal, removedWrittenOffItem }
}

/**
 * Splits quantity from an active item into a new needs-repair item.
 * If the original quantity becomes 0, the original is soft-deleted (`removed: true`).
 */
export function markAsNeedsRepair(
  originalItemId: string,
  quantityNeedingRepair: number,
  repairDate: string,
  repairComment: string,
  userEmail: string,
): { updatedOriginal: InventoryItem; newRepairItem: InventoryItem } {
  const items = getAllInventoryItemsRaw()
  const originalIndex = items.findIndex((item) => item.id === originalItemId)
  if (originalIndex === -1) {
    throw new Error(`[inventoryStorage] markAsNeedsRepair: item not found (${originalItemId})`)
  }

  const original = items[originalIndex]
  if (original.condition === "written_off") {
    throw new Error(
      `[inventoryStorage] markAsNeedsRepair: written-off item cannot be marked for repair (${originalItemId})`,
    )
  }
  if (original.availability === "borrowed") {
    throw new Error(
      `[inventoryStorage] markAsNeedsRepair: borrowed item cannot be marked for repair (${originalItemId})`,
    )
  }
  if (!Number.isFinite(quantityNeedingRepair) || quantityNeedingRepair <= 0) {
    throw new Error("[inventoryStorage] markAsNeedsRepair: quantityNeedingRepair must be > 0")
  }
  if (quantityNeedingRepair > original.quantity) {
    throw new Error(
      `[inventoryStorage] markAsNeedsRepair: quantityNeedingRepair (${quantityNeedingRepair}) exceeds available quantity (${original.quantity})`,
    )
  }

  const timestamp = nowIso()
  const newQuantity = original.quantity - quantityNeedingRepair
  const updatedOriginal: InventoryItem = {
    ...original,
    quantity: newQuantity,
    removed: newQuantity === 0 ? true : original.removed,
    updatedAt: timestamp,
  }

  const newIdValue = newId()
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const newRepairItem: InventoryItem = {
    ...original,
    id: newIdValue,
    quantity: quantityNeedingRepair,
    condition: "needs_repair",
    repairDate,
    repairComment,
    originalItemId: original.id,
    writeOffDate: null,
    writeOffReason: null,
    borrowDate: null,
    qrCodeValue: `${origin}/inventory/${newIdValue}`,
    removed: false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const next = [...items]
  next[originalIndex] = updatedOriginal
  next.push(newRepairItem)
  saveInventoryItems(next)

  recordInventoryUpdatedExcludingQuantity(original, updatedOriginal, userEmail)
  recordMarkedForRepair(original.id, userEmail, {
    quantity: quantityNeedingRepair,
    repairDate,
    repairComment,
    relatedItemId: newRepairItem.id,
  })
  recordInventoryCreated(newRepairItem, userEmail)

  return { updatedOriginal, newRepairItem }
}

/**
 * Returns a needs-repair split item back into its original stock.
 * Soft-deletes the repair row and restores the original (`removed: false`).
 */
export function markAsRepaired(
  repairItemId: string,
  userEmail: string,
): {
  updatedOriginal: InventoryItem
  removedRepairItem: InventoryItem
} {
  const items = getAllInventoryItemsRaw()
  const repairIndex = items.findIndex((item) => item.id === repairItemId)
  if (repairIndex === -1) {
    throw new Error(`[inventoryStorage] markAsRepaired: item not found (${repairItemId})`)
  }

  const repairItem = items[repairIndex]
  if (repairItem.condition !== "needs_repair" || !repairItem.originalItemId) {
    throw new Error(
      `[inventoryStorage] markAsRepaired: item is not a needs-repair split (${repairItemId})`,
    )
  }

  const originalIndex = items.findIndex((item) => item.id === repairItem.originalItemId)
  if (originalIndex === -1) {
    throw new Error(
      `[inventoryStorage] markAsRepaired: original item not found (${repairItem.originalItemId})`,
    )
  }

  const timestamp = nowIso()
  const original = items[originalIndex]
  const updatedOriginal: InventoryItem = {
    ...original,
    quantity: original.quantity + repairItem.quantity,
    removed: false,
    updatedAt: timestamp,
  }
  const removedRepairItem: InventoryItem = {
    ...repairItem,
    removed: true,
    updatedAt: timestamp,
  }

  const next = [...items]
  next[originalIndex] = updatedOriginal
  next[repairIndex] = removedRepairItem
  saveInventoryItems(next)

  recordInventoryUpdatedExcludingQuantity(original, updatedOriginal, userEmail)
  recordRepaired(original.id, userEmail, {
    quantity: repairItem.quantity,
    relatedItemId: repairItemId,
  })

  return { updatedOriginal, removedRepairItem }
}

/**
 * Splits quantity from an active item into a new borrowed item.
 * If the original quantity becomes 0, the original is soft-deleted (`removed: true`).
 */
export function markAsBorrowed(
  originalItemId: string,
  quantityToBorrow: number,
  borrowDate: string,
  availabilityComment: string,
  userEmail: string,
): { updatedOriginal: InventoryItem; newBorrowedItem: InventoryItem } {
  const items = getAllInventoryItemsRaw()
  const originalIndex = items.findIndex((item) => item.id === originalItemId)
  if (originalIndex === -1) {
    throw new Error(`[inventoryStorage] markAsBorrowed: item not found (${originalItemId})`)
  }

  const original = items[originalIndex]
  if (original.archived) {
    throw new Error(
      `[inventoryStorage] markAsBorrowed: archived item cannot be borrowed (${originalItemId})`,
    )
  }
  if (original.condition === "written_off") {
    throw new Error(
      `[inventoryStorage] markAsBorrowed: written-off item cannot be borrowed (${originalItemId})`,
    )
  }
  if (original.condition === "needs_repair") {
    throw new Error(
      `[inventoryStorage] markAsBorrowed: item needing repair cannot be borrowed (${originalItemId})`,
    )
  }
  if (original.availability === "borrowed") {
    throw new Error(
      `[inventoryStorage] markAsBorrowed: item is already borrowed (${originalItemId})`,
    )
  }
  if (!Number.isFinite(quantityToBorrow) || quantityToBorrow <= 0) {
    throw new Error("[inventoryStorage] markAsBorrowed: quantityToBorrow must be > 0")
  }
  if (quantityToBorrow > original.quantity) {
    throw new Error(
      `[inventoryStorage] markAsBorrowed: quantityToBorrow (${quantityToBorrow}) exceeds available quantity (${original.quantity})`,
    )
  }

  const timestamp = nowIso()
  const newQuantity = original.quantity - quantityToBorrow
  const updatedOriginal: InventoryItem = {
    ...original,
    quantity: newQuantity,
    removed: newQuantity === 0 ? true : original.removed,
    updatedAt: timestamp,
  }

  const newIdValue = newId()
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const newBorrowedItem: InventoryItem = {
    ...original,
    id: newIdValue,
    quantity: quantityToBorrow,
    availability: "borrowed",
    availabilityComment,
    borrowDate,
    originalItemId: original.id,
    writeOffDate: null,
    writeOffReason: null,
    repairDate: null,
    repairComment: null,
    qrCodeValue: `${origin}/inventory/${newIdValue}`,
    removed: false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const next = [...items]
  next[originalIndex] = updatedOriginal
  next.push(newBorrowedItem)
  saveInventoryItems(next)

  recordInventoryUpdatedExcludingQuantity(original, updatedOriginal, userEmail)
  recordMarkedAsBorrowed(original.id, userEmail, {
    quantity: quantityToBorrow,
    borrowDate,
    availabilityComment,
    relatedItemId: newBorrowedItem.id,
  })
  recordInventoryCreated(newBorrowedItem, userEmail)

  return { updatedOriginal, newBorrowedItem }
}

/**
 * Returns a borrowed item back into its original stock.
 * Split rows are soft-deleted; legacy whole-item borrowed rows are updated in place.
 */
export function returnBorrowed(
  borrowedItemId: string,
  userEmail: string,
): {
  updatedOriginal: InventoryItem
  removedBorrowedItem: InventoryItem | null
} {
  const items = getAllInventoryItemsRaw()
  const borrowedIndex = items.findIndex((item) => item.id === borrowedItemId)
  if (borrowedIndex === -1) {
    throw new Error(`[inventoryStorage] returnBorrowed: item not found (${borrowedItemId})`)
  }

  const borrowedItem = items[borrowedIndex]
  if (borrowedItem.availability !== "borrowed") {
    throw new Error(`[inventoryStorage] returnBorrowed: item is not borrowed (${borrowedItemId})`)
  }

  const timestamp = nowIso()

  if (!borrowedItem.originalItemId) {
    const updatedOriginal: InventoryItem = {
      ...borrowedItem,
      availability: "in_church",
      availabilityComment: "",
      borrowDate: null,
      updatedAt: timestamp,
    }
    const next = [...items]
    next[borrowedIndex] = updatedOriginal
    saveInventoryItems(next)

    recordReturnedFromBorrow(updatedOriginal.id, userEmail, {
      quantity: updatedOriginal.quantity,
      relatedItemId: borrowedItemId,
    })

    return { updatedOriginal, removedBorrowedItem: null }
  }

  const originalIndex = items.findIndex((item) => item.id === borrowedItem.originalItemId)
  if (originalIndex === -1) {
    throw new Error(
      `[inventoryStorage] returnBorrowed: original item not found (${borrowedItem.originalItemId})`,
    )
  }

  const original = items[originalIndex]
  const updatedOriginal: InventoryItem = {
    ...original,
    quantity: original.quantity + borrowedItem.quantity,
    removed: false,
    updatedAt: timestamp,
  }
  const removedBorrowedItem: InventoryItem = {
    ...borrowedItem,
    availability: "in_church",
    availabilityComment: "",
    borrowDate: null,
    removed: true,
    updatedAt: timestamp,
  }

  const next = [...items]
  next[originalIndex] = updatedOriginal
  next[borrowedIndex] = removedBorrowedItem
  saveInventoryItems(next)

  recordInventoryUpdatedExcludingQuantity(original, updatedOriginal, userEmail)
  recordReturnedFromBorrow(original.id, userEmail, {
    quantity: borrowedItem.quantity,
    relatedItemId: borrowedItemId,
  })

  return { updatedOriginal, removedBorrowedItem }
}

/**
 * Compresses an image with browser-image-compression and returns a base64 data URL.
 * Uses a single-pass resize + JPEG encode (no Web Worker) — the default worker
 * loads the lib from a CDN and is much slower for one-off uploads in Vite.
 *
 * NOTE: Photos are stored as base64 in localStorage for now. Browsers typically
 * allow only ~5MB per origin — fine for testing, but move images to Supabase
 * Storage before wiring a real backend.
 */
export async function compressImage(file: File): Promise<string> {
  const options = {
    maxWidthOrHeight: 800,
    // Soft cap after resize; high enough to avoid many quality binary-search passes.
    maxSizeMB: 0.5,
    initialQuality: 0.8,
    maxIteration: 4,
    useWebWorker: false,
    fileType: "image/jpeg",
  }

  const compressedFile = await imageCompression(file, options)
  return imageCompression.getDataUrlFromFile(compressedFile)
}
