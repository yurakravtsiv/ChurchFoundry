import type {
  Category,
  CreateInventoryItemInput,
  InventoryItem,
  Location,
  Subcategory,
  UpdateInventoryItemInput,
} from "@/types/inventory"

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

function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  let next = item
  if (!(typeof item.price === "number" && Number.isFinite(item.price)) && item.price !== null) {
    next = { ...next, price: null }
  }
  if (typeof next.removed !== "boolean") {
    next = { ...next, removed: false }
  }
  return next
}

export function getInventoryItems(): InventoryItem[] {
  migrateLegacyLocationFields()
  const items = readJsonArray<InventoryItem>(INVENTORY_ITEMS_KEY)
  let dirty = false
  const normalized = items.map((item) => {
    const next = normalizeInventoryItem(item)
    if (next !== item) {
      dirty = true
    }
    return next
  })
  if (dirty) {
    writeJson(INVENTORY_ITEMS_KEY, normalized)
  }
  return normalized
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
  const item: InventoryItem = {
    ...data,
    price: data.price ?? null,
    id,
    qrCodeValue: `${origin}/inventory/${id}`,
    archived: false,
    removed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  saveInventoryItems([...getInventoryItems(), item])
  return item
}

export function updateInventoryItem(
  id: string,
  data: UpdateInventoryItemInput,
): InventoryItem | undefined {
  const items = getInventoryItems()
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) {
    return undefined
  }

  const updated: InventoryItem = {
    ...items[index],
    ...data,
    id,
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
  return getInventoryItems().find((item) => item.id === id)
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
