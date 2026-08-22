import { afterEach, describe, expect, it } from "vitest"

import { getEventsForEntity } from "@/lib/eventsStorage"
import {
  createInventoryItem,
  getInventoryItemById,
  getInventoryItems,
  markAsBorrowed,
  markAsNeedsRepair,
  markAsRepaired,
  returnBorrowed,
  returnToStock,
  writeOffItem,
} from "@/lib/inventoryStorage"
import { EVENT_OBJECT_TYPE } from "@/types/events"

const INVENTORY_ITEMS_KEY = "churchfoundry:inventory-items"
const EVENTS_KEY = "churchfoundry:events"
const USER = "tester@example.com"

function createActiveItem(quantity: number) {
  return createInventoryItem(
    {
      name: "Mic",
      categoryId: "cat",
      subcategoryId: "sub",
      quantity,
      locationId: "loc",
      responsibleId: "resp",
      availability: "in_church",
      availabilityComment: "",
      supplier: "",
      serialNumber: "",
      warrantyUntil: null,
      comment: "",
      photos: [],
      avatarPhotoId: null,
    },
    USER,
  )
}

describe("partial inventory returns", () => {
  afterEach(() => {
    localStorage.removeItem(INVENTORY_ITEMS_KEY)
    localStorage.removeItem(EVENTS_KEY)
  })

  it("returns part of a written-off split and keeps the remainder written off", () => {
    const original = createActiveItem(5)
    const { newWrittenOffItem } = writeOffItem(original.id, 3, "2026-01-01", "Broken", USER)

    returnToStock(newWrittenOffItem.id, 1, USER)

    expect(getInventoryItemById(original.id)?.quantity).toBe(3)
    expect(getInventoryItemById(newWrittenOffItem.id)?.quantity).toBe(2)
    expect(getInventoryItemById(newWrittenOffItem.id)?.condition).toBe("written_off")
  })

  it("removes a written-off split when the full quantity is returned", () => {
    const original = createActiveItem(5)
    const { newWrittenOffItem } = writeOffItem(original.id, 3, "2026-01-01", "Broken", USER)

    returnToStock(newWrittenOffItem.id, 3, USER)

    expect(getInventoryItemById(original.id)?.quantity).toBe(5)
    expect(getInventoryItemById(newWrittenOffItem.id)).toBeUndefined()
    expect(getInventoryItems().some((item) => item.id === newWrittenOffItem.id)).toBe(false)
  })

  it("returns part of a repair split and keeps the remainder in repair", () => {
    const original = createActiveItem(4)
    const { newRepairItem } = markAsNeedsRepair(original.id, 3, "2026-01-02", "No sound", USER)

    markAsRepaired(newRepairItem.id, 1, USER)

    expect(getInventoryItemById(original.id)?.quantity).toBe(2)
    expect(getInventoryItemById(newRepairItem.id)?.quantity).toBe(2)
    expect(getInventoryItemById(newRepairItem.id)?.condition).toBe("needs_repair")
  })

  it("returns part of a borrowed split and keeps the remainder borrowed", () => {
    const original = createActiveItem(6)
    const { newBorrowedItem } = markAsBorrowed(
      original.id,
      4,
      "2026-01-03",
      "2026-01-10",
      "Choir",
      USER,
    )

    returnBorrowed(newBorrowedItem.id, 1, USER)

    expect(getInventoryItemById(original.id)?.quantity).toBe(3)
    expect(getInventoryItemById(newBorrowedItem.id)?.quantity).toBe(3)
    expect(getInventoryItemById(newBorrowedItem.id)?.availability).toBe("borrowed")
  })

  it("records a return event on the written-off item after a partial return", () => {
    const original = createActiveItem(5)
    const { newWrittenOffItem } = writeOffItem(original.id, 3, "2026-01-01", "Broken", USER)

    returnToStock(newWrittenOffItem.id, 1, USER)

    const events = getEventsForEntity(EVENT_OBJECT_TYPE.INVENTORY_ITEM, newWrittenOffItem.id)
    expect(events.some((event) => event.type === "returned_to_stock")).toBe(true)
  })

  it("records a repaired event on the repair item after a partial return", () => {
    const original = createActiveItem(4)
    const { newRepairItem } = markAsNeedsRepair(original.id, 3, "2026-01-02", "No sound", USER)

    markAsRepaired(newRepairItem.id, 1, USER)

    const events = getEventsForEntity(EVENT_OBJECT_TYPE.INVENTORY_ITEM, newRepairItem.id)
    expect(events.some((event) => event.type === "repaired")).toBe(true)
  })

  it("records a return event on the borrowed item after a partial return", () => {
    const original = createActiveItem(6)
    const { newBorrowedItem } = markAsBorrowed(
      original.id,
      4,
      "2026-01-03",
      "2026-01-10",
      "Choir",
      USER,
    )

    returnBorrowed(newBorrowedItem.id, 1, USER)

    const events = getEventsForEntity(EVENT_OBJECT_TYPE.INVENTORY_ITEM, newBorrowedItem.id)
    expect(events.some((event) => event.type === "returned_from_borrow")).toBe(true)
  })

  it("rejects a return quantity larger than the split", () => {
    const original = createActiveItem(2)
    const { newWrittenOffItem } = writeOffItem(original.id, 2, "2026-01-01", "Broken", USER)

    expect(() => returnToStock(newWrittenOffItem.id, 3, USER)).toThrow(/exceeds available quantity/)
  })
})
