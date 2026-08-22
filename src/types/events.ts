export const EVENT_OBJECT_TYPE = {
  INVENTORY_ITEM: 1,
  // майбутні типи сутностей додаватимуться сюди з наступними номерами
} as const

export type EventObjectType = (typeof EVENT_OBJECT_TYPE)[keyof typeof EVENT_OBJECT_TYPE]

export type EventType =
  | "created"
  | "updated"
  | "written_off"
  | "returned_to_stock"
  | "marked_for_repair"
  | "repaired"
  | "marked_as_borrowed"
  | "returned_from_borrow"

export type CreatedEventPayload = Record<string, unknown>
export type UpdatedEventPayload = Record<string, { old: unknown; new: unknown }>

export type WrittenOffEventPayload = {
  quantity: number
  writeOffDate: string
  writeOffReason: string
  relatedItemId: string
}

export type ReturnedToStockEventPayload = {
  quantity: number
  relatedItemId: string
}

export type MarkedForRepairEventPayload = {
  quantity: number
  repairDate: string
  repairComment: string
  relatedItemId: string
}

export type RepairedEventPayload = {
  quantity: number
  relatedItemId: string
}

export type MarkedAsBorrowedEventPayload = {
  quantity: number
  borrowDate: string
  returnDate?: string
  availabilityComment: string
  relatedItemId: string
}

export type ReturnedFromBorrowEventPayload = {
  quantity: number
  relatedItemId: string
}

export type EventPayload =
  | CreatedEventPayload
  | UpdatedEventPayload
  | WrittenOffEventPayload
  | ReturnedToStockEventPayload
  | MarkedForRepairEventPayload
  | RepairedEventPayload
  | MarkedAsBorrowedEventPayload
  | ReturnedFromBorrowEventPayload

export type AppEvent = {
  id: string
  objectId: EventObjectType
  entityId: string
  type: EventType
  userEmail: string
  createdAt: string
  payload: string // JSON.stringify(EventPayload)
}
