import type { TFunction } from "i18next"

import type { AvailabilityStatus, ItemCondition } from "@/types/inventory"

export function availabilityLabel(availability: AvailabilityStatus, t: TFunction) {
  return availability === "in_church"
    ? t("inventory.availability.inChurch")
    : t("inventory.availability.borrowed")
}

export function conditionLabel(condition: ItemCondition, t: TFunction) {
  if (condition === "needs_repair") {
    return t("inventory.condition.needsRepair")
  }
  if (condition === "written_off") {
    return t("inventory.condition.writtenOff")
  }
  return t("inventory.condition.good")
}
