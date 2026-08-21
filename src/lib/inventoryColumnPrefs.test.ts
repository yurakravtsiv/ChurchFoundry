import { afterEach, describe, expect, it } from "vitest"

import { getDefaultColumnPrefs } from "@/lib/inventoryColumnConfig"
import {
  clearInventoryColumnPrefs,
  INVENTORY_COLUMN_PREFS_STORAGE_KEY,
  loadInventoryColumnPrefs,
  saveInventoryColumnPrefs,
} from "@/lib/inventoryColumnPrefs"

describe("inventoryColumnPrefs", () => {
  afterEach(() => {
    localStorage.removeItem(INVENTORY_COLUMN_PREFS_STORAGE_KEY)
  })

  it("returns defaults when nothing is stored", () => {
    expect(loadInventoryColumnPrefs()).toEqual(getDefaultColumnPrefs())
  })

  it("round-trips saved prefs", () => {
    const prefs = {
      version: 1 as const,
      order: [...getDefaultColumnPrefs().order],
      hidden: ["photo" as const, "comment" as const],
    }
    saveInventoryColumnPrefs(prefs)
    const loaded = loadInventoryColumnPrefs()
    expect(loaded.hidden).toContain("photo")
    expect(loaded.hidden).toContain("comment")
    expect(loaded.hidden).not.toContain("name")
  })

  it("falls back to defaults for corrupt JSON", () => {
    localStorage.setItem(INVENTORY_COLUMN_PREFS_STORAGE_KEY, "{not-json")
    expect(loadInventoryColumnPrefs()).toEqual(getDefaultColumnPrefs())
  })

  it("clearInventoryColumnPrefs restores defaults on next load", () => {
    saveInventoryColumnPrefs({
      version: 1,
      order: [...getDefaultColumnPrefs().order],
      hidden: ["comment"],
    })
    clearInventoryColumnPrefs()
    expect(loadInventoryColumnPrefs()).toEqual(getDefaultColumnPrefs())
  })
})
