import { describe, expect, it } from "vitest"

import { compareLocaleText, sortByName } from "@/lib/localeCompare"

describe("sortByName", () => {
  it("sorts English names case-insensitively", () => {
    const sorted = sortByName([{ name: "Storage" }, { name: "attic" }, { name: "Hall" }], "en")
    expect(sorted.map((item) => item.name)).toEqual(["attic", "Hall", "Storage"])
  })

  it("sorts Ukrainian names with uk locale rules", () => {
    const sorted = sortByName([{ name: "Яна" }, { name: "Богдан" }, { name: "Андрій" }], "uk")
    expect(sorted.map((item) => item.name)).toEqual(["Андрій", "Богдан", "Яна"])
  })

  it("does not mutate the original array", () => {
    const items = [{ name: "B" }, { name: "A" }]
    const sorted = sortByName(items, "en")
    expect(items.map((item) => item.name)).toEqual(["B", "A"])
    expect(sorted.map((item) => item.name)).toEqual(["A", "B"])
  })
})

describe("compareLocaleText", () => {
  it("treats letter case as equal at base sensitivity", () => {
    expect(compareLocaleText("Hall", "hall", "en")).toBe(0)
  })
})
