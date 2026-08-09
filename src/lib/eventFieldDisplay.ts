import type { TFunction } from "i18next"

import { parseDateInputValue } from "@/components/ui/date-picker"
import { availabilityLabel, conditionLabel } from "@/lib/inventoryLabels"
import type { AvailabilityStatus, ItemCondition } from "@/types/inventory"

export const EVENT_FIELD_I18N_KEYS: Record<string, string> = {
  name: "inventory.form.name",
  categoryId: "inventory.form.category",
  subcategoryId: "inventory.form.subcategory",
  quantity: "inventory.form.quantity",
  locationId: "inventory.form.location",
  availability: "inventory.form.availability",
  availabilityComment: "inventory.form.availabilityComment",
  condition: "inventory.form.condition",
  supplier: "inventory.form.supplier",
  price: "inventory.form.price",
  serialNumber: "inventory.form.serialNumber",
  warrantyUntil: "inventory.form.warrantyUntil",
  comment: "inventory.form.comment",
  archived: "inventory.timeline.archived",
}

export type EventTaxonomyLookups = {
  categoryNameById: ReadonlyMap<string, string>
  subcategoryNameById: ReadonlyMap<string, string>
  locationNameById: ReadonlyMap<string, string>
}

function isAvailabilityStatus(value: unknown): value is AvailabilityStatus {
  return value === "in_church" || value === "borrowed"
}

function isItemCondition(value: unknown): value is ItemCondition {
  return value === "good" || value === "needs_repair" || value === "written_off"
}

function formatDateValue(value: unknown, locale: string): string {
  if (typeof value !== "string" || !value) {
    return "—"
  }
  const date = parseDateInputValue(value) ?? new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }
  return date.toLocaleDateString(locale)
}

export function formatEventFieldValue(
  field: string,
  value: unknown,
  t: TFunction,
  locale: string,
  lookups: EventTaxonomyLookups,
): string {
  if (value === null || value === undefined || value === "") {
    return "—"
  }

  switch (field) {
    case "categoryId":
      return typeof value === "string" ? (lookups.categoryNameById.get(value) ?? "—") : "—"
    case "subcategoryId":
      return typeof value === "string" ? (lookups.subcategoryNameById.get(value) ?? "—") : "—"
    case "locationId":
      return typeof value === "string" ? (lookups.locationNameById.get(value) ?? "—") : "—"
    case "availability":
      return isAvailabilityStatus(value) ? availabilityLabel(value, t) : String(value)
    case "condition":
      return isItemCondition(value) ? conditionLabel(value, t) : String(value)
    case "price":
      return typeof value === "number" && Number.isFinite(value) ? String(value) : "—"
    case "warrantyUntil":
      return formatDateValue(value, locale)
    case "quantity":
      return typeof value === "number" && Number.isFinite(value) ? String(value) : "—"
    default:
      return String(value)
  }
}

export function formatEventDateTime(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
