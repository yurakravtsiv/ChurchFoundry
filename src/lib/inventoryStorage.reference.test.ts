import { afterEach, describe, expect, it } from "vitest"

import {
  createCategory,
  createLocation,
  createSubcategory,
  deleteCategory,
  deleteLocation,
  deleteSubcategory,
  getCategories,
  getInventoryReferenceLookups,
  getLocations,
  getSubcategories,
  updateCategory,
  updateLocation,
  updateSubcategory,
} from "@/lib/inventoryStorage"

const CATEGORIES_KEY = "churchfoundry:categories"
const SUBCATEGORIES_KEY = "churchfoundry:subcategories"
const LOCATIONS_KEY = "churchfoundry:locations"

describe("inventory reference entity storage", () => {
  afterEach(() => {
    localStorage.removeItem(CATEGORIES_KEY)
    localStorage.removeItem(SUBCATEGORIES_KEY)
    localStorage.removeItem(LOCATIONS_KEY)
  })

  it("hides soft-deleted categories from getCategories but keeps them in lookups", () => {
    const category = createCategory("Sound")
    deleteCategory(category.id)

    expect(getCategories()).toEqual([])
    const lookups = getInventoryReferenceLookups()
    expect(lookups.categories).toEqual([{ ...category, removed: true }])
  })

  it("cascades category delete to its subcategories", () => {
    const category = createCategory("Sound")
    const other = createCategory("Furniture")
    const mic = createSubcategory(category.id, "Mics")
    const chairs = createSubcategory(other.id, "Chairs")

    deleteCategory(category.id)

    expect(getCategories().map((item) => item.id)).toEqual([other.id])
    expect(getSubcategories().map((item) => item.id)).toEqual([chairs.id])

    const lookups = getInventoryReferenceLookups()
    expect(lookups.subcategories.find((item) => item.id === mic.id)?.removed).toBe(true)
    expect(lookups.subcategories.find((item) => item.id === chairs.id)?.removed).toBe(false)
  })

  it("does not wipe removed entities when creating a new one", () => {
    const removed = createCategory("Old")
    deleteCategory(removed.id)
    const next = createCategory("New")

    expect(getCategories().map((item) => item.id)).toEqual([next.id])
    const lookups = getInventoryReferenceLookups()
    expect(lookups.categories.map((item) => item.id).sort()).toEqual([removed.id, next.id].sort())
    expect(lookups.categories.find((item) => item.id === removed.id)?.removed).toBe(true)
  })

  it("renames a visible category and ignores updates to removed ones", () => {
    const category = createCategory("Sound")
    expect(updateCategory(category.id, "Audio")?.name).toBe("Audio")
    expect(getCategories()[0]?.name).toBe("Audio")

    deleteCategory(category.id)
    expect(updateCategory(category.id, "Nope")).toBeUndefined()
    expect(getInventoryReferenceLookups().categories[0]?.name).toBe("Audio")
  })

  it("soft-deletes a subcategory without removing siblings", () => {
    const category = createCategory("Sound")
    const mics = createSubcategory(category.id, "Mics")
    const speakers = createSubcategory(category.id, "Speakers")
    deleteSubcategory(mics.id)

    expect(getSubcategories().map((item) => item.id)).toEqual([speakers.id])
    expect(
      getInventoryReferenceLookups().subcategories.find((item) => item.id === mics.id)?.removed,
    ).toBe(true)
  })

  it("renames a subcategory", () => {
    const category = createCategory("Sound")
    const mics = createSubcategory(category.id, "Mics")
    expect(updateSubcategory(mics.id, "Microphones")?.name).toBe("Microphones")
    expect(getSubcategories()[0]?.name).toBe("Microphones")
  })

  it("soft-deletes and renames locations without dropping removed rows on create", () => {
    const oldLocation = createLocation("Hall")
    deleteLocation(oldLocation.id)
    const next = createLocation("Storage")
    expect(updateLocation(next.id, "Warehouse")?.name).toBe("Warehouse")

    expect(getLocations().map((item) => item.name)).toEqual(["Warehouse"])
    const lookups = getInventoryReferenceLookups()
    expect(lookups.locations).toHaveLength(2)
    expect(lookups.locations.find((item) => item.id === oldLocation.id)?.removed).toBe(true)
  })
})
