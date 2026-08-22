import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { EventTimelineCard } from "@/components/inventory/EventTimelineCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useEventsForEntityQuery } from "@/hooks/queries/useEventsQueries"
import { useInventoryReferenceLookupsQuery } from "@/hooks/queries/useInventoryQueries"
import type { EventTaxonomyLookups } from "@/lib/eventFieldDisplay"
import { cn } from "@/lib/utils"
import type { EventObjectType } from "@/types/events"
import type { InventoryPhoto } from "@/types/inventory"

type InventoryItemTimelineProps = {
  objectId: EventObjectType
  entityId: string
  photos?: readonly InventoryPhoto[]
  className?: string
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {(["timeline-skeleton-1", "timeline-skeleton-2", "timeline-skeleton-3"] as const).map(
        (key) => (
          <Skeleton key={key} className="h-20 w-full rounded-xl" />
        ),
      )}
    </div>
  )
}

export function InventoryItemTimeline({
  objectId,
  entityId,
  photos = [],
  className,
}: InventoryItemTimelineProps) {
  const { t } = useTranslation()
  const { data: events = [], isLoading } = useEventsForEntityQuery(objectId, entityId)
  const { data: referenceLookups } = useInventoryReferenceLookupsQuery()
  const categories = referenceLookups?.categories ?? []
  const subcategories = referenceLookups?.subcategories ?? []
  const locations = referenceLookups?.locations ?? []
  const responsibles = referenceLookups?.responsibles ?? []

  const lookups = useMemo<EventTaxonomyLookups>(
    () => ({
      categoryNameById: new Map(categories.map((category) => [category.id, category.name])),
      subcategoryNameById: new Map(
        subcategories.map((subcategory) => [subcategory.id, subcategory.name]),
      ),
      locationNameById: new Map(locations.map((location) => [location.id, location.name])),
      responsibleNameById: new Map(
        responsibles.map((responsible) => [responsible.id, responsible.name]),
      ),
    }),
    [categories, locations, responsibles, subcategories],
  )

  return (
    <Card className={cn("flex h-full max-h-full min-w-0 flex-col overflow-hidden", className)}>
      <CardHeader className="shrink-0 px-4 py-4">
        <CardTitle>{t("inventory.timeline.title")}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-0">
        {isLoading ? (
          <TimelineSkeleton />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("inventory.timeline.empty")}</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventTimelineCard key={event.id} event={event} lookups={lookups} photos={photos} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
