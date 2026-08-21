import { describe, expect, it } from "vitest"

import { optionsUsedByItems, optionsWithCurrent } from "@/lib/inventoryReferenceOptions"

type Entity = { id: string; name: string }

const visible: Entity[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
]
const lookups: Entity[] = [...visible, { id: "removed", name: "Gone" }]

describe("optionsWithCurrent", () => {
  it("returns visible options when there is no current id", () => {
    expect(optionsWithCurrent(visible, lookups, "")).toEqual(visible)
    expect(optionsWithCurrent(visible, lookups, undefined)).toEqual(visible)
  })

  it("returns visible options when current id is already visible", () => {
    expect(optionsWithCurrent(visible, lookups, "a")).toEqual(visible)
  })

  it("prepends a lookup-only current entity", () => {
    expect(optionsWithCurrent(visible, lookups, "removed")).toEqual([
      { id: "removed", name: "Gone" },
      ...visible,
    ])
  })

  it("ignores a current id that is missing from lookups", () => {
    expect(optionsWithCurrent(visible, lookups, "unknown")).toEqual(visible)
  })
})

describe("optionsUsedByItems", () => {
  it("returns visible options when used ids are all visible", () => {
    expect(optionsUsedByItems(visible, lookups, ["a", "b"])).toEqual(visible)
  })

  it("appends lookup entities that items still reference", () => {
    expect(optionsUsedByItems(visible, lookups, ["a", "removed", "removed"])).toEqual([
      ...visible,
      { id: "removed", name: "Gone" },
    ])
  })

  it("ignores used ids that are not in lookups", () => {
    expect(optionsUsedByItems(visible, lookups, ["missing"])).toEqual(visible)
  })
})
