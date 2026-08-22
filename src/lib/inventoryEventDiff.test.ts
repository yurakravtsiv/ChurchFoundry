import { describe, expect, it } from "vitest"

import { buildUpdatedPayload, diffPhotoIds } from "@/lib/inventoryEventDiff"
import type { InventoryItem } from "@/types/inventory"

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "item-1",
    inventoryNumberId: 1,
    name: "Mic",
    categoryId: "cat-1",
    subcategoryId: "sub-1",
    quantity: 1,
    locationId: "loc-1",
    responsibleId: "resp-1",
    availability: "in_church",
    availabilityComment: "",
    condition: "good",
    supplier: "",
    price: null,
    serialNumber: "",
    warrantyUntil: null,
    comment: "",
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

describe("diffPhotoIds", () => {
  it("returns added and removed ids", () => {
    expect(diffPhotoIds(["a", "b"], ["b", "c"])).toEqual({
      added: ["c"],
      removed: ["a"],
    })
  })

  it("ignores non-string values", () => {
    expect(diffPhotoIds(["a", 1], ["a", null, "b"])).toEqual({
      added: ["b"],
      removed: [],
    })
  })
})

describe("buildUpdatedPayload photo changes", () => {
  it("records added and removed photo ids without data urls", () => {
    const before = makeItem({
      photos: [{ id: "keep", dataUrl: "data:image/jpeg;base64,OLD" }],
      avatarPhotoId: "keep",
    })
    const after = makeItem({
      photos: [
        { id: "keep", dataUrl: "data:image/jpeg;base64,OLD" },
        { id: "new", dataUrl: "data:image/jpeg;base64,HUGE" },
      ],
      avatarPhotoId: "keep",
    })

    const payload = buildUpdatedPayload(before, after)
    expect(payload).toEqual({
      photos: { old: ["keep"], new: ["keep", "new"] },
    })
    expect(JSON.stringify(payload)).not.toContain("data:image")
  })

  it("records avatar change even when the photo set is unchanged", () => {
    const photos = [
      { id: "one", dataUrl: "data:image/jpeg;base64,A" },
      { id: "two", dataUrl: "data:image/jpeg;base64,B" },
    ]
    const before = makeItem({ photos, avatarPhotoId: "one" })
    const after = makeItem({ photos, avatarPhotoId: "two" })

    expect(buildUpdatedPayload(before, after)).toEqual({
      avatarPhotoId: { old: "one", new: "two" },
    })
  })

  it("creates an event payload for photo-only edits", () => {
    const before = makeItem()
    const after = makeItem({
      photos: [{ id: "first", dataUrl: "data:image/jpeg;base64,A" }],
      avatarPhotoId: "first",
    })

    expect(buildUpdatedPayload(before, after)).toEqual({
      photos: { old: [], new: ["first"] },
      avatarPhotoId: { old: null, new: "first" },
    })
  })

  it("ignores photo reorder with the same ids", () => {
    const photos = [
      { id: "one", dataUrl: "data:image/jpeg;base64,A" },
      { id: "two", dataUrl: "data:image/jpeg;base64,B" },
    ]
    const before = makeItem({ photos, avatarPhotoId: "one" })
    const after = makeItem({ photos: [...photos].reverse(), avatarPhotoId: "one" })

    expect(buildUpdatedPayload(before, after)).toBeNull()
  })

  it("still records regular field changes together with photos", () => {
    const before = makeItem({ name: "Old" })
    const after = makeItem({
      name: "New",
      photos: [{ id: "p1", dataUrl: "data:image/jpeg;base64,A" }],
      avatarPhotoId: "p1",
    })

    const payload = buildUpdatedPayload(before, after)
    expect(payload?.name).toEqual({ old: "Old", new: "New" })
    expect(payload?.photos).toEqual({ old: [], new: ["p1"] })
    expect(payload?.avatarPhotoId).toEqual({ old: null, new: "p1" })
  })
})
