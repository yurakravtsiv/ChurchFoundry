export const EVENT_OBJECT_TYPE = {
  INVENTORY_ITEM: 1,
  // майбутні типи сутностей додаватимуться сюди з наступними номерами
} as const

export type EventObjectType = (typeof EVENT_OBJECT_TYPE)[keyof typeof EVENT_OBJECT_TYPE]

export type EventType = "created" | "updated"

export type CreatedEventPayload = Record<string, unknown>
export type UpdatedEventPayload = Record<string, { old: unknown; new: unknown }>

export type AppEvent = {
  id: string
  objectId: EventObjectType
  entityId: string
  type: EventType
  userEmail: string
  createdAt: string
  payload: string // JSON.stringify(CreatedEventPayload | UpdatedEventPayload)
}
