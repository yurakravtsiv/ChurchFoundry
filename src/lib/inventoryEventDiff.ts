import type { CreatedEventPayload, UpdatedEventPayload } from "@/types/events"
import type { InventoryItem } from "@/types/inventory"

const TRACKED_FIELDS = [
  "name",
  "categoryId",
  "subcategoryId",
  "quantity",
  "locationId",
  "responsibleId",
  "availability",
  "availabilityComment",
  "supplier",
  "price",
  "serialNumber",
  "warrantyUntil",
  "comment",
  "condition",
  "writeOffDate",
  "writeOffReason",
  "repairDate",
  "repairComment",
  "borrowDate",
] as const satisfies ReadonlyArray<keyof InventoryItem>

type TrackedField = (typeof TRACKED_FIELDS)[number]

function buildCreatedPayload(item: InventoryItem): CreatedEventPayload {
  const payload: CreatedEventPayload = {}
  for (const field of TRACKED_FIELDS) {
    payload[field] = item[field as TrackedField]
  }
  return payload
}

function photoIds(item: InventoryItem): string[] {
  return item.photos.map((photo) => photo.id)
}

function samePhotoIdSet(before: InventoryItem, after: InventoryItem): boolean {
  const beforeIds = photoIds(before)
  const afterIds = photoIds(after)
  if (beforeIds.length !== afterIds.length) {
    return false
  }
  const afterSet = new Set(afterIds)
  return beforeIds.every((id) => afterSet.has(id))
}

function applyPhotoDiff(
  diff: UpdatedEventPayload,
  before: InventoryItem,
  after: InventoryItem,
): void {
  if (!samePhotoIdSet(before, after)) {
    diff.photos = { old: photoIds(before), new: photoIds(after) }
  }
  if (before.avatarPhotoId !== after.avatarPhotoId) {
    diff.avatarPhotoId = { old: before.avatarPhotoId, new: after.avatarPhotoId }
  }
}

export function asPhotoIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((id): id is string => typeof id === "string")
}

export function diffPhotoIds(
  oldValue: unknown,
  newValue: unknown,
): { added: string[]; removed: string[] } {
  const oldIds = asPhotoIdList(oldValue)
  const newIds = asPhotoIdList(newValue)
  const oldSet = new Set(oldIds)
  const newSet = new Set(newIds)
  return {
    added: newIds.filter((id) => !oldSet.has(id)),
    removed: oldIds.filter((id) => !newSet.has(id)),
  }
}

function buildUpdatedPayload(
  before: InventoryItem,
  after: InventoryItem,
): UpdatedEventPayload | null {
  const diff: UpdatedEventPayload = {}
  for (const field of TRACKED_FIELDS) {
    const key = field as TrackedField
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[field] = { old: before[key], new: after[key] }
    }
  }
  applyPhotoDiff(diff, before, after)
  return Object.keys(diff).length > 0 ? diff : null
}

function buildUpdatedPayloadExcluding(
  before: InventoryItem,
  after: InventoryItem,
  excludeFields: readonly string[],
): UpdatedEventPayload | null {
  const diff = buildUpdatedPayload(before, after)
  if (!diff) {
    return null
  }
  for (const field of excludeFields) {
    delete diff[field]
  }
  return Object.keys(diff).length > 0 ? diff : null
}

export { buildCreatedPayload, buildUpdatedPayload, buildUpdatedPayloadExcluding, TRACKED_FIELDS }
