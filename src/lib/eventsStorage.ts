import type { AppEvent, EventObjectType, EventPayload, EventType } from "@/types/events"

const EVENTS_KEY = "churchfoundry:events"

function newId() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

function readEvents(): AppEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AppEvent[]) : []
  } catch (error) {
    console.error("[eventsStorage] Failed to read events", error)
    return []
  }
}

export function getEvents(): AppEvent[] {
  return readEvents()
}

export function saveEvents(events: AppEvent[]): void {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  } catch (error) {
    console.error("[eventsStorage] Failed to save events", error)
  }
}

export function createEvent(params: {
  objectId: EventObjectType
  entityId: string
  type: EventType
  userEmail: string
  payload: EventPayload
}): AppEvent {
  const event: AppEvent = {
    id: newId(),
    objectId: params.objectId,
    entityId: params.entityId,
    type: params.type,
    userEmail: params.userEmail,
    createdAt: nowIso(),
    payload: JSON.stringify(params.payload),
  }
  saveEvents([...readEvents(), event])
  return event
}

export function getEventsForEntity(objectId: EventObjectType, entityId: string): AppEvent[] {
  return readEvents()
    .filter((event) => event.objectId === objectId && event.entityId === entityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
