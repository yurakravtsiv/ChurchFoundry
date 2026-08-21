import { describe, expect, it } from "vitest"
import i18n from "@/lib/i18n"
import {
  getDefaultColumnPrefs,
  getSearchableColumnIds,
  type InventoryColumnPrefs,
} from "@/lib/inventoryColumnConfig"
import { itemMatchesSearch } from "@/lib/inventorySearch"
import type { Category, InventoryItem, Location, Subcategory } from "@/types/inventory"

const categories: Category[] = [{ id: "cat-1", name: "Sound", removed: false }]
const subcategories: Subcategory[] = [
  { id: "sub-1", categoryId: "cat-1", name: "Microphones", removed: false },
]
const locations: Location[] = [{ id: "loc-1", name: "Storage", removed: false }]

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "item-1",
    inventoryNumberId: 42,
    name: "Shure SM58",
    categoryId: "cat-1",
    subcategoryId: "sub-1",
    quantity: 3,
    locationId: "loc-1",
    availability: "in_church",
    availabilityComment: "",
    condition: "good",
    supplier: "MusicShop",
    price: 199,
    serialNumber: "SN-12345",
    warrantyUntil: "2028-01-01",
    comment: "Main vocal mic",
    photos: [],
    avatarPhotoId: null,
    qrCodeValue: "https://example.test/inventory/item-1",
    archived: false,
    removed: false,
    writeOffDate: null,
    writeOffReason: null,
    originalItemId: null,
    repairDate: null,
    repairComment: null,
    borrowDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("itemMatchesSearch", () => {
  it("matches visible default columns", () => {
    const ids = getSearchableColumnIds(getDefaultColumnPrefs())
    const item = makeItem()
    expect(itemMatchesSearch(item, "SM58", categories, subcategories, locations, i18n.t, ids)).toBe(
      true,
    )
    expect(
      itemMatchesSearch(item, "Sound", categories, subcategories, locations, i18n.t, ids),
    ).toBe(true)
    expect(
      itemMatchesSearch(item, "vocal", categories, subcategories, locations, i18n.t, ids),
    ).toBe(true)
  })

  it("does not search inventoryNumberId even when the column is enabled", () => {
    const prefs: InventoryColumnPrefs = {
      version: 1,
      order: [...getDefaultColumnPrefs().order],
      hidden: [],
    }
    const ids = getSearchableColumnIds(prefs)
    expect(
      itemMatchesSearch(makeItem(), "42", categories, subcategories, locations, i18n.t, ids),
    ).toBe(false)
  })

  it("does not search hidden columns", () => {
    const prefs: InventoryColumnPrefs = {
      ...getDefaultColumnPrefs(),
      hidden: [...getDefaultColumnPrefs().hidden, "comment", "supplier"],
    }
    const ids = getSearchableColumnIds(prefs)
    const item = makeItem()
    expect(
      itemMatchesSearch(item, "vocal", categories, subcategories, locations, i18n.t, ids),
    ).toBe(false)
    expect(
      itemMatchesSearch(item, "MusicShop", categories, subcategories, locations, i18n.t, ids),
    ).toBe(false)
  })

  it("searches optional columns only after they are enabled", () => {
    const defaults = getSearchableColumnIds(getDefaultColumnPrefs())
    const item = makeItem()
    expect(
      itemMatchesSearch(item, "MusicShop", categories, subcategories, locations, i18n.t, defaults),
    ).toBe(false)

    const enabled: InventoryColumnPrefs = {
      version: 1,
      order: [...getDefaultColumnPrefs().order],
      hidden: getDefaultColumnPrefs().hidden.filter((id) => id !== "supplier"),
    }
    expect(
      itemMatchesSearch(
        item,
        "MusicShop",
        categories,
        subcategories,
        locations,
        i18n.t,
        getSearchableColumnIds(enabled),
      ),
    ).toBe(true)
  })
})
