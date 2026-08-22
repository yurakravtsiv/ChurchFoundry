import { afterEach, describe, expect, it } from "vitest"

import { isBorrowReturnOverdue } from "@/lib/borrowDates"
import { generateSeedData } from "@/lib/inventoryDataGenerator"
import { getInventoryItems } from "@/lib/inventoryStorage"

const CATEGORIES_KEY = "churchfoundry:categories"
const SUBCATEGORIES_KEY = "churchfoundry:subcategories"
const LOCATIONS_KEY = "churchfoundry:locations"
const RESPONSIBLES_KEY = "churchfoundry:responsibles"
const INVENTORY_ITEMS_KEY = "churchfoundry:inventory-items"
const EVENTS_KEY = "churchfoundry:events"

function exclusiveStatus(item: {
  condition: string
  availability: string
}): "written_off" | "needs_repair" | "borrowed" | null {
  if (item.condition === "written_off") {
    return "written_off"
  }
  if (item.condition === "needs_repair") {
    return "needs_repair"
  }
  if (item.availability === "borrowed") {
    return "borrowed"
  }
  return null
}

describe("generateSeedData", () => {
  afterEach(() => {
    localStorage.removeItem(CATEGORIES_KEY)
    localStorage.removeItem(SUBCATEGORIES_KEY)
    localStorage.removeItem(LOCATIONS_KEY)
    localStorage.removeItem(RESPONSIBLES_KEY)
    localStorage.removeItem(INVENTORY_ITEMS_KEY)
    localStorage.removeItem(EVENTS_KEY)
  })

  it("does not mix write-off, repair, and borrow on the same inventory item", () => {
    generateSeedData("tester@example.com")

    const items = getInventoryItems()
    const writtenOff = items.filter((item) => item.condition === "written_off")
    const repairs = items.filter((item) => item.condition === "needs_repair")
    const borrowed = items.filter((item) => item.availability === "borrowed")

    expect(writtenOff).toHaveLength(3)
    expect(repairs).toHaveLength(3)
    expect(borrowed).toHaveLength(3)

    for (const item of items) {
      const statuses = [
        item.condition === "written_off",
        item.condition === "needs_repair",
        item.availability === "borrowed",
      ].filter(Boolean)
      expect(statuses.length, item.name).toBeLessThanOrEqual(1)
    }

    const splitTypesByOriginal = new Map<string, Set<string>>()
    for (const item of items) {
      if (!item.originalItemId) {
        continue
      }
      const status = exclusiveStatus(item)
      expect(status, item.name).not.toBeNull()
      const types = splitTypesByOriginal.get(item.originalItemId) ?? new Set<string>()
      types.add(status!)
      splitTypesByOriginal.set(item.originalItemId, types)
    }

    for (const types of splitTypesByOriginal.values()) {
      expect(types.size).toBe(1)
    }
  })

  it("gives every borrowed item a return date and at least one overdue return", () => {
    generateSeedData("tester@example.com")

    const borrowed = getInventoryItems().filter((item) => item.availability === "borrowed")
    expect(borrowed.length).toBeGreaterThan(0)

    for (const item of borrowed) {
      expect(item.returnDate, item.name).toBeTruthy()
      expect(item.borrowDate, item.name).toBeTruthy()
      expect(item.returnDate! > item.borrowDate!, item.name).toBe(true)
    }

    expect(borrowed.some((item) => isBorrowReturnOverdue(item.returnDate))).toBe(true)
  })
})
