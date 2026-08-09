import { Archive, ChevronDown, Pencil, PlusCircle } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  EVENT_FIELD_I18N_KEYS,
  type EventTaxonomyLookups,
  formatEventDateTime,
  formatEventFieldValue,
} from "@/lib/eventFieldDisplay"
import { TRACKED_FIELDS } from "@/lib/inventoryEventDiff"
import { cn } from "@/lib/utils"
import type { AppEvent, CreatedEventPayload, UpdatedEventPayload } from "@/types/events"

type EventTimelineCardProps = {
  event: AppEvent
  lookups: EventTaxonomyLookups
}

type ParsedPayload = CreatedEventPayload | UpdatedEventPayload

function parseEventPayload(payload: string): ParsedPayload | null {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ParsedPayload
    }
    return null
  } catch {
    return null
  }
}

function isUpdatedPayload(payload: ParsedPayload): payload is UpdatedEventPayload {
  const firstKey = Object.keys(payload)[0]
  if (!firstKey) {
    return false
  }
  const firstValue = payload[firstKey]
  return (
    firstValue !== null &&
    typeof firstValue === "object" &&
    !Array.isArray(firstValue) &&
    "old" in firstValue &&
    "new" in firstValue
  )
}

function ArchivedPayloadRow({
  newValue,
  t,
}: {
  newValue: unknown
  t: ReturnType<typeof useTranslation>["t"]
}) {
  const yes = newValue === true
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{t("inventory.timeline.archived")}: </span>
      <span>{yes ? t("inventory.unsavedChanges.yes") : t("inventory.unsavedChanges.no")}</span>
    </div>
  )
}

function CreatedPayloadDetails({
  payload,
  lookups,
  t,
  locale,
}: {
  payload: CreatedEventPayload
  lookups: EventTaxonomyLookups
  t: ReturnType<typeof useTranslation>["t"]
  locale: string
}) {
  const fields = TRACKED_FIELDS.filter((field) => field in payload)

  return (
    <ul className="space-y-1.5 text-sm">
      {fields.map((field) => (
        <li key={field}>
          <span className="text-muted-foreground">
            {t(EVENT_FIELD_I18N_KEYS[field] ?? field)}:{" "}
          </span>
          <span>{formatEventFieldValue(field, payload[field], t, locale, lookups)}</span>
        </li>
      ))}
    </ul>
  )
}

function UpdatedPayloadDetails({
  payload,
  lookups,
  t,
  locale,
}: {
  payload: UpdatedEventPayload
  lookups: EventTaxonomyLookups
  t: ReturnType<typeof useTranslation>["t"]
  locale: string
}) {
  const fields = Object.keys(payload)

  return (
    <ul className="space-y-1.5 text-sm">
      {fields.map((field) => {
        const change = payload[field]
        if (!change || typeof change !== "object" || !("old" in change) || !("new" in change)) {
          return null
        }

        if (field === "archived") {
          return (
            <li key={field}>
              <ArchivedPayloadRow newValue={change.new} t={t} />
            </li>
          )
        }

        const label = t(EVENT_FIELD_I18N_KEYS[field] ?? field)
        const oldFormatted = formatEventFieldValue(field, change.old, t, locale, lookups)
        const newFormatted = formatEventFieldValue(field, change.new, t, locale, lookups)

        return (
          <li key={field}>
            <span className="text-muted-foreground">{label}: </span>
            <span className="text-muted-foreground line-through">{oldFormatted}</span>
            <span className="text-muted-foreground"> → </span>
            <span>{newFormatted}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function EventTimelineCard({ event, lookups }: EventTimelineCardProps) {
  const { t, i18n } = useTranslation()
  const payload = useMemo(() => parseEventPayload(event.payload), [event.payload])
  const isArchivedUpdate = payload !== null && isUpdatedPayload(payload) && "archived" in payload

  const Icon = event.type === "created" ? PlusCircle : isArchivedUpdate ? Archive : Pencil
  const iconClassName =
    event.type === "created"
      ? "text-green-600 dark:text-green-500"
      : isArchivedUpdate
        ? "text-amber-600 dark:text-amber-500"
        : "text-blue-600 dark:text-blue-400"

  const actionTitle =
    event.type === "created" ? t("inventory.timeline.created") : t("inventory.timeline.updated")

  return (
    <Card className="shadow-sm">
      <Collapsible className="group">
        <CardContent className="p-3">
          <div className="flex gap-3">
            <Icon className={cn("mt-0.5 size-4 shrink-0", iconClassName)} aria-hidden />
            <div className="min-w-0 flex-1">
              <CollapsibleTrigger className="flex w-full items-start gap-2 text-left">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-medium leading-none">{actionTitle}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {formatEventDateTime(event.createdAt, i18n.language)}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{event.userEmail || "—"}</p>
                </div>
                <ChevronDown
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>

              {payload ? (
                <CollapsibleContent className="mt-3 border-t pt-3">
                  {event.type === "created" ? (
                    <CreatedPayloadDetails
                      payload={payload as CreatedEventPayload}
                      lookups={lookups}
                      t={t}
                      locale={i18n.language}
                    />
                  ) : isUpdatedPayload(payload) ? (
                    <UpdatedPayloadDetails
                      payload={payload}
                      lookups={lookups}
                      t={t}
                      locale={i18n.language}
                    />
                  ) : null}
                </CollapsibleContent>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  )
}
