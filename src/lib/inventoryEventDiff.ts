import type { CreatedEventPayload, UpdatedEventPayload } from "@/types/events"
import type { InventoryItem } from "@/types/inventory"

const TRACKED_FIELDS = [
  "name",
  "categoryId",
  "subcategoryId",
  "quantity",
  "locationId",
  "availability",
  "availabilityComment",
  "supplier",
  "price",
  "serialNumber",
  "warrantyUntil",
  "comment",
  "condition",
] as const satisfies ReadonlyArray<keyof InventoryItem>

type TrackedField = (typeof TRACKED_FIELDS)[number]

function buildCreatedPayload(item: InventoryItem): CreatedEventPayload {
  const payload: CreatedEventPayload = {}
  for (const field of TRACKED_FIELDS) {
    payload[field] = item[field as TrackedField]
  }
  return payload
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
  return Object.keys(diff).length > 0 ? diff : null
}

export { buildCreatedPayload, buildUpdatedPayload, TRACKED_FIELDS }
