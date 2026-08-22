import { describe, expect, it } from "vitest"

import {
  getDefaultColumnPrefs,
  getExportDataColumnIds,
  getSearchableColumnIds,
  type InventoryColumnPrefs,
  isDefaultColumnPrefs,
  mergeColumnPrefs,
  resolveVisibleColumnIds,
} from "@/lib/inventoryColumnConfig"

const emptyContext = {
  hasRepairItems: false,
  hasBorrowedItems: false,
  showWrittenOff: false,
}

describe("mergeColumnPrefs", () => {
  it("returns defaults for invalid stored values", () => {
    expect(mergeColumnPrefs(null)).toEqual(getDefaultColumnPrefs())
    expect(mergeColumnPrefs("nope")).toEqual(getDefaultColumnPrefs())
    expect(mergeColumnPrefs({})).toEqual(getDefaultColumnPrefs())
  })

  it("keeps saved order, drops unknown ids, and appends new columns", () => {
    const merged = mergeColumnPrefs({
      version: 1,
      order: ["name", "unknown-column", "photo", "name"],
      hidden: ["photo", "name"],
    })

    expect(merged.order[0]).toBe("name")
    expect(merged.order[1]).toBe("photo")
    expect(merged.order).not.toContain("unknown-column")
    expect(merged.order.at(-1)).toBe("comment")
    expect(merged.hidden).not.toContain("name")
    expect(merged.hidden).toContain("photo")
  })

  it("applies default visibility to newly appended columns", () => {
    const merged = mergeColumnPrefs({
      version: 1,
      order: ["photo", "name", "category"],
      hidden: [],
    })

    expect(merged.hidden).toContain("inventoryNumberId")
    expect(merged.hidden).toContain("supplier")
    expect(merged.hidden).not.toContain("quantity")
  })

  it("inserts the returnDate column after borrowDate in saved order", () => {
    const merged = mergeColumnPrefs({
      version: 1,
      order: ["name", "availability", "borrowDate", "comment"],
      hidden: [],
    })

    const borrowDateIndex = merged.order.indexOf("borrowDate")
    expect(merged.order[borrowDateIndex + 1]).toBe("returnDate")
    expect(merged.hidden).not.toContain("returnDate")
  })

  it("inserts the responsible column after location in saved order", () => {
    const merged = mergeColumnPrefs({
      version: 1,
      order: ["name", "location", "condition", "comment"],
      hidden: [],
    })

    const locationIndex = merged.order.indexOf("location")
    expect(merged.order[locationIndex + 1]).toBe("responsible")
    expect(merged.hidden).not.toContain("responsible")
  })
})

describe("resolveVisibleColumnIds", () => {
  it("matches the default table layout without contextual columns", () => {
    expect(resolveVisibleColumnIds(getDefaultColumnPrefs(), emptyContext)).toEqual([
      "photo",
      "name",
      "category",
      "subcategory",
      "quantity",
      "location",
      "responsible",
      "condition",
      "availability",
      "availabilityComment",
      "comment",
    ])
  })

  it("includes contextual columns only when the context is active and they are enabled", () => {
    const prefs = getDefaultColumnPrefs()
    expect(resolveVisibleColumnIds(prefs, { ...emptyContext, hasRepairItems: true })).toContain(
      "repairDate",
    )

    const hiddenRepair: InventoryColumnPrefs = {
      ...prefs,
      hidden: [...prefs.hidden, "repairDate", "repairComment"],
    }
    expect(
      resolveVisibleColumnIds(hiddenRepair, { ...emptyContext, hasRepairItems: true }),
    ).not.toContain("repairDate")
  })

  it("respects custom order and hidden columns", () => {
    const prefs: InventoryColumnPrefs = {
      version: 1,
      order: ["name", "quantity", "photo", "comment"],
      hidden: ["photo"],
    }
    expect(resolveVisibleColumnIds(mergeColumnPrefs(prefs), emptyContext)).toEqual([
      "name",
      "quantity",
      "comment",
      "category",
      "subcategory",
      "location",
      "responsible",
      "condition",
      "availability",
      "availabilityComment",
    ])
  })
})

describe("getSearchableColumnIds", () => {
  it("excludes photo and inventoryNumberId even when they are visible", () => {
    const prefs: InventoryColumnPrefs = {
      version: 1,
      order: [...getDefaultColumnPrefs().order],
      hidden: [],
    }
    const ids = getSearchableColumnIds(prefs)
    expect(ids).not.toContain("photo")
    expect(ids).not.toContain("inventoryNumberId")
    expect(ids).toContain("name")
    expect(ids).toContain("supplier")
    expect(ids).toContain("responsible")
  })
})

describe("getExportDataColumnIds", () => {
  it("drops photo and keeps user order", () => {
    expect(getExportDataColumnIds(["photo", "name", "quantity", "comment"])).toEqual([
      "name",
      "quantity",
      "comment",
    ])
  })
})

describe("isDefaultColumnPrefs", () => {
  it("treats default prefs as default regardless of hidden array order", () => {
    const defaults = getDefaultColumnPrefs()
    expect(isDefaultColumnPrefs(defaults)).toBe(true)
    expect(
      isDefaultColumnPrefs({
        ...defaults,
        hidden: [...defaults.hidden].reverse(),
      }),
    ).toBe(true)
    expect(isDefaultColumnPrefs({ ...defaults, order: ["name", ...defaults.order.slice(1)] })).toBe(
      false,
    )
  })
})
