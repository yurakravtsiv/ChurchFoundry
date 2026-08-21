import { describe, expect, it } from "vitest"

import { getDefaultColumnPrefs, resolveVisibleColumnIds } from "@/lib/inventoryColumnConfig"
import { getExportRowKeys } from "@/lib/inventoryExport"

describe("getExportRowKeys", () => {
  it("matches the default table columns without photo or extras", () => {
    const visibleColumnIds = resolveVisibleColumnIds(getDefaultColumnPrefs(), {
      hasRepairItems: false,
      hasBorrowedItems: false,
      showWrittenOff: false,
    })
    expect(getExportRowKeys({ visibleColumnIds })).toEqual([
      "name",
      "category",
      "subcategory",
      "quantity",
      "location",
      "condition",
      "availability",
      "availabilityComment",
      "comment",
    ])
  })

  it("follows custom order and omits hidden columns", () => {
    expect(
      getExportRowKeys({
        visibleColumnIds: ["photo", "comment", "name", "supplier"],
      }),
    ).toEqual(["comment", "name", "supplier"])
  })

  it("includes contextual write-off columns when they are visible", () => {
    const visibleColumnIds = resolveVisibleColumnIds(getDefaultColumnPrefs(), {
      hasRepairItems: false,
      hasBorrowedItems: false,
      showWrittenOff: true,
    })
    const keys = getExportRowKeys({ visibleColumnIds, includeWriteOffColumns: true })
    expect(keys).toContain("writeOffDate")
    expect(keys).toContain("writeOffReason")
    expect(keys).not.toContain("inventoryNumberId")
  })
})
