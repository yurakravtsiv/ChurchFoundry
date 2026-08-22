import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Handshake,
  ImageOff,
  PackageMinus,
  PackagePlus,
  Pencil,
  PlusCircle,
  Star,
  Undo2,
  Wrench,
} from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  EVENT_FIELD_I18N_KEYS,
  type EventTaxonomyLookups,
  formatEventDateOnly,
  formatEventDateTime,
  formatEventFieldValue,
} from "@/lib/eventFieldDisplay"
import { diffPhotoIds, TRACKED_FIELDS } from "@/lib/inventoryEventDiff"
import { cn } from "@/lib/utils"
import type {
  AppEvent,
  CreatedEventPayload,
  MarkedAsBorrowedEventPayload,
  MarkedForRepairEventPayload,
  RepairedEventPayload,
  ReturnedFromBorrowEventPayload,
  ReturnedToStockEventPayload,
  UpdatedEventPayload,
  WrittenOffEventPayload,
} from "@/types/events"
import type { InventoryPhoto } from "@/types/inventory"

type EventTimelineCardProps = {
  event: AppEvent
  lookups: EventTaxonomyLookups
  photos?: readonly InventoryPhoto[]
}

type ParsedPayload = Record<string, unknown>

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

function parseWrittenOffPayload(payload: ParsedPayload): WrittenOffEventPayload | null {
  if (
    typeof payload.quantity === "number" &&
    typeof payload.writeOffDate === "string" &&
    typeof payload.writeOffReason === "string" &&
    typeof payload.relatedItemId === "string"
  ) {
    return payload as WrittenOffEventPayload
  }
  return null
}

function parseReturnedToStockPayload(payload: ParsedPayload): ReturnedToStockEventPayload | null {
  if (typeof payload.quantity === "number" && typeof payload.relatedItemId === "string") {
    return payload as ReturnedToStockEventPayload
  }
  return null
}

function parseMarkedForRepairPayload(payload: ParsedPayload): MarkedForRepairEventPayload | null {
  if (
    typeof payload.quantity === "number" &&
    typeof payload.repairDate === "string" &&
    typeof payload.repairComment === "string" &&
    typeof payload.relatedItemId === "string"
  ) {
    return payload as MarkedForRepairEventPayload
  }
  return null
}

function parseRepairedPayload(payload: ParsedPayload): RepairedEventPayload | null {
  if (typeof payload.quantity === "number" && typeof payload.relatedItemId === "string") {
    return payload as RepairedEventPayload
  }
  return null
}

function parseMarkedAsBorrowedPayload(payload: ParsedPayload): MarkedAsBorrowedEventPayload | null {
  if (
    typeof payload.quantity === "number" &&
    typeof payload.borrowDate === "string" &&
    typeof payload.availabilityComment === "string" &&
    typeof payload.relatedItemId === "string"
  ) {
    return payload as MarkedAsBorrowedEventPayload
  }
  return null
}

function parseReturnedFromBorrowPayload(
  payload: ParsedPayload,
): ReturnedFromBorrowEventPayload | null {
  if (typeof payload.quantity === "number" && typeof payload.relatedItemId === "string") {
    return payload as ReturnedFromBorrowEventPayload
  }
  return null
}

function EventCardHeader({
  icon: Icon,
  iconClassName,
  title,
  createdAt,
  userEmail,
  locale,
}: {
  icon: typeof PlusCircle
  iconClassName: string
  title: string
  createdAt: string
  userEmail: string
  locale: string
}) {
  return (
    <div className="flex gap-3">
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClassName)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium leading-none">{title}</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {formatEventDateTime(createdAt, locale)}
        </p>
        <p className="truncate text-sm text-muted-foreground">{userEmail || "—"}</p>
      </div>
    </div>
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

function TimelinePhotoThumb({
  photoId,
  photosById,
  markedAsAvatar = false,
}: {
  photoId: string | null
  photosById: ReadonlyMap<string, string>
  markedAsAvatar?: boolean
}) {
  const dataUrl = photoId ? photosById.get(photoId) : undefined
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-md border bg-muted",
        markedAsAvatar && "ring-2 ring-amber-400",
      )}
    >
      {dataUrl ? (
        <img src={dataUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center">
          <ImageOff className="size-3.5 text-muted-foreground" aria-hidden />
        </span>
      )}
      {markedAsAvatar ? (
        <Star
          className="absolute bottom-0.5 right-0.5 size-2.5 fill-amber-400 text-amber-400 drop-shadow"
          aria-hidden
        />
      ) : null}
    </span>
  )
}

function PhotosChangeRows({
  oldIds,
  newIds,
  photosById,
  t,
}: {
  oldIds: unknown
  newIds: unknown
  photosById: ReadonlyMap<string, string>
  t: ReturnType<typeof useTranslation>["t"]
}) {
  const { added, removed } = diffPhotoIds(oldIds, newIds)
  const addedStillPresent = added.filter((photoId) => photosById.has(photoId))
  return (
    <>
      {added.length > 0 ? (
        <li className="space-y-1.5">
          <span className="text-muted-foreground">
            {t("inventory.timeline.photosAdded", { count: added.length })}
          </span>
          {addedStillPresent.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {addedStillPresent.map((photoId) => (
                <TimelinePhotoThumb key={photoId} photoId={photoId} photosById={photosById} />
              ))}
            </div>
          ) : null}
        </li>
      ) : null}
      {removed.length > 0 ? (
        <li>
          <span className="text-muted-foreground">
            {t("inventory.timeline.photosRemoved", { count: removed.length })}
          </span>
        </li>
      ) : null}
    </>
  )
}

function AvatarChangeRow({
  oldId,
  newId,
  photosById,
  t,
}: {
  oldId: unknown
  newId: unknown
  photosById: ReadonlyMap<string, string>
  t: ReturnType<typeof useTranslation>["t"]
}) {
  const oldPhotoId = typeof oldId === "string" ? oldId : null
  const newPhotoId = typeof newId === "string" ? newId : null
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{t("inventory.timeline.avatarChanged")}:</span>
        <TimelinePhotoThumb
          photoId={oldPhotoId}
          photosById={photosById}
          markedAsAvatar={oldPhotoId !== null}
        />
        <span className="text-muted-foreground">→</span>
        <TimelinePhotoThumb
          photoId={newPhotoId}
          photosById={photosById}
          markedAsAvatar={newPhotoId !== null}
        />
      </div>
    </li>
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
  photosById,
  t,
  locale,
}: {
  payload: UpdatedEventPayload
  lookups: EventTaxonomyLookups
  photosById: ReadonlyMap<string, string>
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

        if (field === "photos") {
          return (
            <PhotosChangeRows
              key={field}
              oldIds={change.old}
              newIds={change.new}
              photosById={photosById}
              t={t}
            />
          )
        }

        if (field === "avatarPhotoId") {
          return (
            <AvatarChangeRow
              key={field}
              oldId={change.old}
              newId={change.new}
              photosById={photosById}
              t={t}
            />
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

function EventViewLink({
  relatedItemId,
  t,
}: {
  relatedItemId: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Link
      to={`/inventory/${relatedItemId}`}
      className="inline-block text-sm font-medium text-primary hover:underline"
    >
      {t("events.viewLink")}
    </Link>
  )
}

function WrittenOffEventCard({
  event,
  payload,
  locale,
  t,
}: {
  event: AppEvent
  payload: WrittenOffEventPayload
  locale: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <EventCardHeader
          icon={PackageMinus}
          iconClassName="text-red-600 dark:text-red-500"
          title={t("inventory.timeline.writtenOff")}
          createdAt={event.createdAt}
          userEmail={event.userEmail}
          locale={locale}
        />
        <div className="space-y-1 text-sm">
          <p>{t("inventory.timeline.writtenOffQuantity", { quantity: payload.quantity })}</p>
          <p>
            {t("inventory.timeline.writtenOffReason", {
              reason: payload.writeOffReason || "—",
            })}
          </p>
          <p>
            {t("inventory.timeline.writtenOffDate", {
              date: formatEventDateOnly(payload.writeOffDate, locale),
            })}
          </p>
        </div>
        <EventViewLink relatedItemId={payload.relatedItemId} t={t} />
      </CardContent>
    </Card>
  )
}

function ReturnedToStockEventCard({
  event,
  payload,
  locale,
  t,
}: {
  event: AppEvent
  payload: ReturnedToStockEventPayload
  locale: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <EventCardHeader
          icon={PackagePlus}
          iconClassName="text-green-600 dark:text-green-500"
          title={t("inventory.timeline.returnedToStock")}
          createdAt={event.createdAt}
          userEmail={event.userEmail}
          locale={locale}
        />
        <p className="text-sm">
          {t("inventory.timeline.returnedToStockQuantity", { quantity: payload.quantity })}
        </p>
      </CardContent>
    </Card>
  )
}

function MarkedForRepairEventCard({
  event,
  payload,
  locale,
  t,
}: {
  event: AppEvent
  payload: MarkedForRepairEventPayload
  locale: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <EventCardHeader
          icon={Wrench}
          iconClassName="text-amber-600 dark:text-amber-500"
          title={t("inventory.timeline.markedForRepair")}
          createdAt={event.createdAt}
          userEmail={event.userEmail}
          locale={locale}
        />
        <div className="space-y-1 text-sm">
          <p>{t("inventory.timeline.markedForRepairQuantity", { quantity: payload.quantity })}</p>
          <p>
            {t("inventory.timeline.markedForRepairComment", {
              comment: payload.repairComment || "—",
            })}
          </p>
          <p>
            {t("inventory.timeline.markedForRepairDate", {
              date: formatEventDateOnly(payload.repairDate, locale),
            })}
          </p>
        </div>
        <EventViewLink relatedItemId={payload.relatedItemId} t={t} />
      </CardContent>
    </Card>
  )
}

function RepairedEventCard({
  event,
  payload,
  locale,
  t,
}: {
  event: AppEvent
  payload: RepairedEventPayload
  locale: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <EventCardHeader
          icon={CheckCircle2}
          iconClassName="text-green-600 dark:text-green-500"
          title={t("inventory.timeline.repaired")}
          createdAt={event.createdAt}
          userEmail={event.userEmail}
          locale={locale}
        />
        <p className="text-sm">
          {t("inventory.timeline.repairedQuantity", { quantity: payload.quantity })}
        </p>
      </CardContent>
    </Card>
  )
}

function MarkedAsBorrowedEventCard({
  event,
  payload,
  locale,
  t,
}: {
  event: AppEvent
  payload: MarkedAsBorrowedEventPayload
  locale: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <EventCardHeader
          icon={Handshake}
          iconClassName="text-amber-600 dark:text-amber-500"
          title={t("inventory.timeline.markedAsBorrowed")}
          createdAt={event.createdAt}
          userEmail={event.userEmail}
          locale={locale}
        />
        <div className="space-y-1 text-sm">
          <p>{t("inventory.timeline.markedAsBorrowedQuantity", { quantity: payload.quantity })}</p>
          <p>
            {t("inventory.timeline.markedAsBorrowedComment", {
              comment: payload.availabilityComment || "—",
            })}
          </p>
          <p>
            {t("inventory.timeline.markedAsBorrowedDate", {
              date: formatEventDateOnly(payload.borrowDate, locale),
            })}
          </p>
        </div>
        <EventViewLink relatedItemId={payload.relatedItemId} t={t} />
      </CardContent>
    </Card>
  )
}

function ReturnedFromBorrowEventCard({
  event,
  payload,
  locale,
  t,
}: {
  event: AppEvent
  payload: ReturnedFromBorrowEventPayload
  locale: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <EventCardHeader
          icon={Undo2}
          iconClassName="text-green-600 dark:text-green-500"
          title={t("inventory.timeline.returnedFromBorrow")}
          createdAt={event.createdAt}
          userEmail={event.userEmail}
          locale={locale}
        />
        <p className="text-sm">
          {t("inventory.timeline.returnedFromBorrowQuantity", { quantity: payload.quantity })}
        </p>
      </CardContent>
    </Card>
  )
}

function CollapsibleEventCard({
  event,
  payload,
  lookups,
  photosById,
  locale,
  t,
}: {
  event: AppEvent
  payload: ParsedPayload | null
  lookups: EventTaxonomyLookups
  photosById: ReadonlyMap<string, string>
  locale: string
  t: ReturnType<typeof useTranslation>["t"]
}) {
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
                    {formatEventDateTime(event.createdAt, locale)}
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
                      locale={locale}
                    />
                  ) : isUpdatedPayload(payload) ? (
                    <UpdatedPayloadDetails
                      payload={payload}
                      lookups={lookups}
                      photosById={photosById}
                      t={t}
                      locale={locale}
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

export function EventTimelineCard({ event, lookups, photos = [] }: EventTimelineCardProps) {
  const { t, i18n } = useTranslation()
  const payload = useMemo(() => parseEventPayload(event.payload), [event.payload])
  const photosById = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo.dataUrl])),
    [photos],
  )

  if (event.type === "written_off") {
    const writtenOffPayload = payload ? parseWrittenOffPayload(payload) : null
    if (writtenOffPayload) {
      return (
        <WrittenOffEventCard
          event={event}
          payload={writtenOffPayload}
          locale={i18n.language}
          t={t}
        />
      )
    }
  }

  if (event.type === "returned_to_stock") {
    const returnedPayload = payload ? parseReturnedToStockPayload(payload) : null
    if (returnedPayload) {
      return (
        <ReturnedToStockEventCard
          event={event}
          payload={returnedPayload}
          locale={i18n.language}
          t={t}
        />
      )
    }
  }

  if (event.type === "marked_for_repair") {
    const repairPayload = payload ? parseMarkedForRepairPayload(payload) : null
    if (repairPayload) {
      return (
        <MarkedForRepairEventCard
          event={event}
          payload={repairPayload}
          locale={i18n.language}
          t={t}
        />
      )
    }
  }

  if (event.type === "repaired") {
    const repairedPayload = payload ? parseRepairedPayload(payload) : null
    if (repairedPayload) {
      return (
        <RepairedEventCard event={event} payload={repairedPayload} locale={i18n.language} t={t} />
      )
    }
  }

  if (event.type === "marked_as_borrowed") {
    const borrowedPayload = payload ? parseMarkedAsBorrowedPayload(payload) : null
    if (borrowedPayload) {
      return (
        <MarkedAsBorrowedEventCard
          event={event}
          payload={borrowedPayload}
          locale={i18n.language}
          t={t}
        />
      )
    }
  }

  if (event.type === "returned_from_borrow") {
    const returnedPayload = payload ? parseReturnedFromBorrowPayload(payload) : null
    if (returnedPayload) {
      return (
        <ReturnedFromBorrowEventCard
          event={event}
          payload={returnedPayload}
          locale={i18n.language}
          t={t}
        />
      )
    }
  }

  return (
    <CollapsibleEventCard
      event={event}
      payload={payload}
      lookups={lookups}
      photosById={photosById}
      locale={i18n.language}
      t={t}
    />
  )
}
