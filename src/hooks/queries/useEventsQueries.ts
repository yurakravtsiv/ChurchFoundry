import { useQuery } from "@tanstack/react-query"

import { getEventsForEntity } from "@/lib/eventsStorage"
import type { EventObjectType } from "@/types/events"

export const eventsQueryKeys = {
  entity: (objectId: EventObjectType, entityId: string) => ["events", objectId, entityId] as const,
}

export function useEventsForEntityQuery(objectId: EventObjectType, entityId: string) {
  return useQuery({
    queryKey: eventsQueryKeys.entity(objectId, entityId),
    queryFn: () => getEventsForEntity(objectId, entityId),
    enabled: Boolean(entityId),
  })
}
