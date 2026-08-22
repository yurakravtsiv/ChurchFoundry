import { afterEach, describe, expect, it } from "vitest"

import {
  clearInventoryTableView,
  DEFAULT_INVENTORY_SORTING,
  DEFAULT_INVENTORY_TABLE_VIEW,
  INVENTORY_TABLE_VIEW_STORAGE_KEY,
  isDefaultInventorySorting,
  loadInventoryTableView,
  parseInventoryTableView,
  saveInventoryTableView,
} from "@/lib/inventoryTableView"

describe("inventoryTableView", () => {
  afterEach(() => {
    localStorage.removeItem(INVENTORY_TABLE_VIEW_STORAGE_KEY)
  })

  it("returns defaults when nothing is stored", () => {
    expect(loadInventoryTableView()).toEqual(DEFAULT_INVENTORY_TABLE_VIEW)
  })

  it("round-trips saved filters and sorting", () => {
    const view = {
      sorting: [{ id: "quantity", desc: true }],
      search: "mic",
      categoryFilter: "cat-1",
      subcategoryFilter: "sub-1",
      availabilityFilter: "borrowed",
      locationFilter: "loc-1",
      responsibleFilter: "resp-1",
      conditionFilter: "needs_repair",
      showArchived: true,
      showWrittenOff: false,
    }
    saveInventoryTableView(view)
    expect(loadInventoryTableView()).toEqual(view)
  })

  it("falls back to defaults for corrupt JSON", () => {
    localStorage.setItem(INVENTORY_TABLE_VIEW_STORAGE_KEY, "{not-json")
    expect(loadInventoryTableView()).toEqual(DEFAULT_INVENTORY_TABLE_VIEW)
  })

  it("ignores invalid sorting entries", () => {
    expect(parseInventoryTableView({ sorting: [{ id: 1, desc: false }] }).sorting).toEqual(
      DEFAULT_INVENTORY_SORTING,
    )
  })

  it("clearInventoryTableView restores defaults on next load", () => {
    saveInventoryTableView({
      ...DEFAULT_INVENTORY_TABLE_VIEW,
      search: "keep me",
      sorting: [{ id: "price", desc: true }],
    })
    clearInventoryTableView()
    expect(loadInventoryTableView()).toEqual(DEFAULT_INVENTORY_TABLE_VIEW)
  })

  it("detects the default name sort", () => {
    expect(isDefaultInventorySorting(DEFAULT_INVENTORY_SORTING)).toBe(true)
    expect(isDefaultInventorySorting([{ id: "name", desc: true }])).toBe(false)
    expect(isDefaultInventorySorting([{ id: "quantity", desc: false }])).toBe(false)
  })
})
