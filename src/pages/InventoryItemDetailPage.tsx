import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  CheckCircle2,
  Handshake,
  MoreVertical,
  Package,
  PackageMinus,
  PackagePlus,
  PackageX,
  Undo2,
  Wrench,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"
import { useBlocker, useNavigate, useParams } from "react-router"

import { BorrowDialog } from "@/components/inventory/BorrowDialog"
import { BorrowReturnDateCell } from "@/components/inventory/BorrowReturnDateCell"
import {
  InventoryItemForm,
  type InventoryItemFormHandle,
  type InventoryItemFormValues,
} from "@/components/inventory/InventoryItemForm"
import { InventoryItemTimeline } from "@/components/inventory/InventoryItemTimeline"
import { ItemQrCode } from "@/components/inventory/ItemQrCode"
import { NeedsRepairDialog } from "@/components/inventory/NeedsRepairDialog"
import { RepairedConfirmDialog } from "@/components/inventory/RepairedConfirmDialog"
import { ReturnBorrowedDialog } from "@/components/inventory/ReturnBorrowedDialog"
import { ReturnToStockDialog } from "@/components/inventory/ReturnToStockDialog"
import { WriteOffDialog } from "@/components/inventory/WriteOffDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MotionDialogContent } from "@/components/ui/motion-dialog-content"
import { QueryErrorState } from "@/components/ui/query-error-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  useArchiveInventoryItemMutation,
  useInventoryItemsQuery,
  useUpdateInventoryItemMutation,
} from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import { EVENT_OBJECT_TYPE } from "@/types/events"
import type { UpdateInventoryItemInput } from "@/types/inventory"

const EDIT_FORM_ID = "inventory-item-edit-form"

/** Unified padding: headers px-4 py-4, body below header px-4 pb-4 pt-0. */
const DETAIL_CARD_PADDING = "px-4 py-4"
const DETAIL_CARD_BODY_PADDING = "px-4 pb-4 pt-0"
const DETAIL_TABLE_EDGE_CLASS =
  "[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4"

function subscribeMdUp(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 768px)")
  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function getMdUpSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches
}

function getMdUpServerSnapshot() {
  return true
}

function canNavigateBack() {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === "number" && idx > 0
}

function toUpdatePayload(
  data: InventoryItemFormValues,
  item: { availability: string; condition: string },
): UpdateInventoryItemInput {
  if (item.condition === "written_off") {
    return {
      writeOffDate: data.writeOffDate ?? null,
      writeOffReason: data.writeOffReason?.trim() ?? "",
    }
  }
  if (item.condition === "needs_repair") {
    return {
      repairDate: data.repairDate ?? null,
      repairComment: data.repairComment?.trim() ?? "",
    }
  }
  if (item.availability === "borrowed") {
    return {
      borrowDate: data.borrowDate ?? null,
      returnDate: data.returnDate ?? null,
      availabilityComment: data.availabilityComment.trim(),
    }
  }
  const {
    writeOffDate: _writeOffDate,
    writeOffReason: _writeOffReason,
    repairDate: _repairDate,
    repairComment: _repairComment,
    borrowDate: _borrowDate,
    returnDate: _returnDate,
    ...rest
  } = data
  return rest
}

function InventoryItemDetailSkeleton() {
  return (
    <main className="bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        <div className="mx-auto w-full max-w-[1400px] space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64 sm:h-9 sm:w-80" />
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-[15px] pb-[20px] pt-[10px] md:grid-cols-3 md:items-start">
        <div className="min-w-0 space-y-4 rounded-xl border bg-card px-6 py-4 md:col-span-2">
          {[
            "name",
            "category",
            "subcategory",
            "quantity",
            "condition",
            "location",
            "responsible",
            "availability",
            "comment",
          ].map((fieldKey) => (
            <div key={fieldKey} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-6 md:col-span-1">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <Skeleton className="size-[200px] rounded-md" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

export function InventoryItemDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { data: items = [], isLoading, isError, refetch } = useInventoryItemsQuery()
  const { user } = useAuth()
  const userEmail = user?.email ?? ""
  const updateItemMutation = useUpdateInventoryItemMutation()
  const archiveItemMutation = useArchiveInventoryItemMutation()

  const item = useMemo(() => items.find((entry) => entry.id === id), [id, items])
  const relatedWriteOffs = useMemo(() => {
    if (!item || item.condition === "written_off") {
      return []
    }
    return items.filter(
      (entry) => entry.originalItemId === item.id && entry.condition === "written_off",
    )
  }, [item, items])
  const relatedRepairs = useMemo(() => {
    if (!item || item.condition === "written_off") {
      return []
    }
    return items.filter(
      (entry) =>
        entry.originalItemId === item.id &&
        entry.condition === "needs_repair" &&
        entry.removed !== true,
    )
  }, [item, items])
  const relatedBorrows = useMemo(() => {
    if (!item || item.availability === "borrowed") {
      return []
    }
    return items.filter(
      (entry) =>
        entry.originalItemId === item.id &&
        entry.availability === "borrowed" &&
        entry.removed !== true,
    )
  }, [item, items])

  const avatarPhoto = useMemo(() => {
    if (!item?.avatarPhotoId) {
      return undefined
    }
    return item.photos.find((photo) => photo.id === item.avatarPhotoId)
  }, [item])

  const [formDirty, setFormDirty] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [returnToStockOpen, setReturnToStockOpen] = useState(false)
  const [needsRepairOpen, setNeedsRepairOpen] = useState(false)
  const [repairedConfirmOpen, setRepairedConfirmOpen] = useState(false)
  const [borrowOpen, setBorrowOpen] = useState(false)
  const [returnBorrowedOpen, setReturnBorrowedOpen] = useState(false)
  const isWrittenOff = item?.condition === "written_off"
  const isNeedsRepair = item?.condition === "needs_repair"
  const isBorrowed = item?.availability === "borrowed"
  const isRestrictedEdit = isWrittenOff || isNeedsRepair || isBorrowed

  const formatWriteOffDate = (value: string | null) => {
    if (!value) {
      return "—"
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value.slice(0, 10)
    }
    return date.toLocaleDateString(i18n.language)
  }
  const formatRepairDate = formatWriteOffDate
  const formatBorrowDate = formatWriteOffDate
  const formRef = useRef<InventoryItemFormHandle>(null)
  const isMdUp = useSyncExternalStore(subscribeMdUp, getMdUpSnapshot, getMdUpServerSnapshot)
  const allowLeaveRef = useRef(false)
  const leaveAfterSaveRef = useRef(false)
  const pendingLeaveToRef = useRef<string | null>(null)
  const pendingArchiveAfterSaveRef = useRef(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeaveRef.current && formDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  // Reset leave/dirty state when navigating between inventory item routes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by route param id
  useEffect(() => {
    setFormDirty(false)
    allowLeaveRef.current = false
  }, [id])

  useEffect(() => {
    if (blocker.state === "blocked") {
      setUnsavedPromptOpen(true)
    }
  }, [blocker.state])

  useEffect(() => {
    if (!formDirty) {
      return
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [formDirty])

  const goToInventory = () => {
    navigate("/inventory")
  }

  const navigateBackOrInventory = () => {
    allowLeaveRef.current = true
    if (canNavigateBack()) {
      navigate(-1)
      return
    }
    navigate("/inventory")
  }

  const requestLeave = () => {
    if (formDirty) {
      setUnsavedPromptOpen(true)
      return
    }
    navigateBackOrInventory()
  }

  const clearPendingLeave = () => {
    leaveAfterSaveRef.current = false
    pendingLeaveToRef.current = null
    pendingArchiveAfterSaveRef.current = false
  }

  const stayOnPage = () => {
    clearPendingLeave()
    setUnsavedPromptOpen(false)
    if (blocker.state === "blocked") {
      blocker.reset()
    }
  }

  const confirmDiscard = () => {
    clearPendingLeave()
    allowLeaveRef.current = true
    setUnsavedPromptOpen(false)
    setFormDirty(false)
    if (blocker.state === "blocked") {
      blocker.proceed()
      return
    }
    navigateBackOrInventory()
  }

  const confirmSaveAndLeave = () => {
    if (blocker.state === "blocked") {
      pendingLeaveToRef.current = `${blocker.location.pathname}${blocker.location.search}`
      blocker.reset()
    } else {
      pendingLeaveToRef.current = null
    }
    pendingArchiveAfterSaveRef.current = false
    leaveAfterSaveRef.current = true
    setUnsavedPromptOpen(false)
    const form = document.getElementById(EDIT_FORM_ID)
    if (form instanceof HTMLFormElement) {
      form.requestSubmit()
    }
  }

  const applyArchiveAndLeave = () => {
    if (!item) {
      return
    }
    archiveItemMutation.mutate(
      { id: item.id, currentlyArchived: item.archived, userEmail },
      {
        onSuccess: (updated) => {
          if (!updated) {
            return
          }
          setFormDirty(false)
          navigateBackOrInventory()
        },
      },
    )
  }

  const requestArchiveConfirm = async () => {
    const valid = await formRef.current?.validate()
    if (!valid) {
      return
    }
    setArchiveConfirmOpen(true)
  }

  const confirmArchiveAction = () => {
    if (!item) {
      return
    }
    setArchiveConfirmOpen(false)
    pendingArchiveAfterSaveRef.current = true
    leaveAfterSaveRef.current = false
    pendingLeaveToRef.current = null
    // Let the confirm dialog unmount before submit so field errors can scroll into view.
    window.requestAnimationFrame(() => {
      const form = document.getElementById(EDIT_FORM_ID)
      if (form instanceof HTMLFormElement) {
        form.requestSubmit()
      }
    })
  }

  if (isError) {
    return (
      <main className="bg-background">
        <QueryErrorState onRetry={() => void refetch()} />
      </main>
    )
  }

  if (isLoading) {
    return <InventoryItemDetailSkeleton />
  }

  if (!item) {
    return (
      <main className="flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] w-full flex-col items-center justify-center bg-background px-4 py-12 text-center">
        <PackageX
          className="mb-6 size-24 text-muted-foreground sm:size-28"
          strokeWidth={1.25}
          aria-hidden
        />
        <p className="text-2xl font-medium tracking-tight text-muted-foreground">
          {t("inventory.itemNotFound")}
        </p>
        <Button type="button" className="mt-6" onClick={goToInventory}>
          {t("inventory.detail.returnToInventory")}
        </Button>
      </main>
    )
  }

  const renderEditForm = () => (
    <InventoryItemForm
      ref={formRef}
      key={item.updatedAt}
      id={EDIT_FORM_ID}
      mode="edit"
      layout="page"
      autoFocusFirstField
      initialData={item}
      readOnly={isRestrictedEdit}
      onBusyChange={setFormBusy}
      onDirtyChange={setFormDirty}
      onCancel={requestLeave}
      onInvalid={() => {
        clearPendingLeave()
      }}
      onSubmit={(data) => {
        updateItemMutation.mutate(
          { id: item.id, data: toUpdatePayload(data, item), userEmail },
          {
            onSuccess: (updated) => {
              if (!updated) {
                clearPendingLeave()
                return
              }
              const shouldArchiveAfterSave = pendingArchiveAfterSaveRef.current
              const pendingLeaveTo = pendingLeaveToRef.current
              clearPendingLeave()
              allowLeaveRef.current = true
              setFormDirty(false)
              if (shouldArchiveAfterSave) {
                applyArchiveAndLeave()
                return
              }
              if (pendingLeaveTo) {
                navigate(pendingLeaveTo)
                return
              }
              navigateBackOrInventory()
            },
            onError: () => {
              clearPendingLeave()
            },
          },
        )
      }}
    />
  )

  const renderRepairsTable = () =>
    relatedRepairs.length > 0 ? (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className={DETAIL_CARD_PADDING}>
          <CardTitle>{t("inventory.detail.repairBatchesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <Table className={DETAIL_TABLE_EDGE_CLASS}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("inventory.columns.quantity")}</TableHead>
                <TableHead>{t("inventory.columns.repairDate")}</TableHead>
                <TableHead>{t("inventory.columns.repairComment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedRepairs.map((batch) => (
                <TableRow
                  key={batch.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/inventory/${batch.id}`)}
                >
                  <TableCell className="tabular-nums">{batch.quantity}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatRepairDate(batch.repairDate)}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate">
                    {batch.repairComment || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ) : null

  const renderWriteOffsTable = () =>
    relatedWriteOffs.length > 0 ? (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className={DETAIL_CARD_PADDING}>
          <CardTitle>{t("inventory.detail.writeOffBatchesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <Table className={DETAIL_TABLE_EDGE_CLASS}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("inventory.columns.quantity")}</TableHead>
                <TableHead>{t("inventory.columns.writeOffDate")}</TableHead>
                <TableHead>{t("inventory.columns.writeOffReason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedWriteOffs.map((batch) => (
                <TableRow
                  key={batch.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/inventory/${batch.id}`)}
                >
                  <TableCell className="tabular-nums">{batch.quantity}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatWriteOffDate(batch.writeOffDate)}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate">
                    {batch.writeOffReason || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ) : null

  const renderBorrowsTable = () =>
    relatedBorrows.length > 0 ? (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className={DETAIL_CARD_PADDING}>
          <CardTitle>{t("inventory.detail.borrowBatchesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <Table className={DETAIL_TABLE_EDGE_CLASS}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("inventory.columns.quantity")}</TableHead>
                <TableHead>{t("inventory.columns.borrowDate")}</TableHead>
                <TableHead>{t("inventory.columns.returnDate")}</TableHead>
                <TableHead>{t("inventory.columns.availabilityComment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedBorrows.map((batch) => (
                <TableRow
                  key={batch.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/inventory/${batch.id}`)}
                >
                  <TableCell className="tabular-nums">{batch.quantity}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatBorrowDate(batch.borrowDate)}
                  </TableCell>
                  <TableCell>
                    <BorrowReturnDateCell
                      returnDate={batch.returnDate}
                      formattedDate={formatBorrowDate(batch.returnDate)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate">
                    {batch.availabilityComment || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ) : null

  const renderQrCard = () => (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className={DETAIL_CARD_PADDING}>
        <CardTitle>{t("inventory.detail.qrTitle")}</CardTitle>
      </CardHeader>
      <CardContent
        className={`flex min-w-0 flex-col items-center gap-3 ${DETAIL_CARD_BODY_PADDING}`}
      >
        <ItemQrCode
          value={item.qrCodeValue}
          itemName={item.name}
          inventoryNumberId={item.inventoryNumberId}
          size={200}
        />
        <CardDescription className="text-center">{t("inventory.detail.qrHint")}</CardDescription>
      </CardContent>
    </Card>
  )

  return (
    <main className="bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        <div className="mx-auto w-full max-w-[1400px] space-y-3">
          <button
            type="button"
            onClick={requestLeave}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("inventory.detail.backToInventory")}
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground sm:size-12">
                {avatarPhoto ? (
                  <img
                    src={avatarPhoto.dataUrl}
                    alt=""
                    className="size-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <Package className="size-5 sm:size-6" aria-hidden />
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <h1 className="min-w-0 truncate text-xl font-semibold leading-none tracking-tight sm:text-3xl sm:leading-none">
                  {item.name}
                </h1>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={t("inventory.actions.menu")}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {isBorrowed ? (
                      <DropdownMenuItem onClick={() => setReturnBorrowedOpen(true)}>
                        <Undo2 />
                        {t("inventory.actions.returnBorrowed")}
                      </DropdownMenuItem>
                    ) : isWrittenOff ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Handshake />
                                {t("inventory.actions.borrow")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.borrowWrittenOffHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isNeedsRepair ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Handshake />
                                {t("inventory.actions.borrow")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.borrowNeedsRepairHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : item.archived ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Handshake />
                                {t("inventory.actions.borrow")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.borrowArchivedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <DropdownMenuItem onClick={() => setBorrowOpen(true)}>
                        <Handshake />
                        {t("inventory.actions.borrow")}
                      </DropdownMenuItem>
                    )}
                    {isWrittenOff ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Wrench />
                                {t("inventory.actions.needsRepair")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.needsRepairWrittenOffHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isBorrowed ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Wrench />
                                {t("inventory.actions.needsRepair")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.needsRepairBorrowedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isNeedsRepair ? (
                      <DropdownMenuItem onClick={() => setRepairedConfirmOpen(true)}>
                        <CheckCircle2 />
                        {t("inventory.actions.markRepaired")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setNeedsRepairOpen(true)}>
                        <Wrench />
                        {t("inventory.actions.needsRepair")}
                      </DropdownMenuItem>
                    )}
                    {isWrittenOff ? (
                      <DropdownMenuItem onClick={() => setReturnToStockOpen(true)}>
                        <PackagePlus />
                        {t("inventory.actions.returnToStock")}
                      </DropdownMenuItem>
                    ) : item.archived ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <PackageMinus />
                                {t("inventory.actions.writeOff")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.writeOffArchivedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isNeedsRepair ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <PackageMinus />
                                {t("inventory.actions.writeOff")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.writeOffNeedsRepairHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isBorrowed ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <PackageMinus />
                                {t("inventory.actions.writeOff")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.writeOffBorrowedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <DropdownMenuItem onClick={() => setWriteOffOpen(true)}>
                        <PackageMinus />
                        {t("inventory.actions.writeOff")}
                      </DropdownMenuItem>
                    )}
                    {isWrittenOff ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Archive />
                                {t("inventory.actions.archive")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.archiveWrittenOffHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isNeedsRepair ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Archive />
                                {t("inventory.actions.archive")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.archiveNeedsRepairHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isBorrowed ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Archive />
                                {t("inventory.actions.archive")}
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("inventory.actions.archiveBorrowedHint")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => {
                          void requestArchiveConfirm()
                        }}
                      >
                        {item.archived ? <ArchiveRestore /> : <Archive />}
                        {item.archived
                          ? t("inventory.actions.unarchive")
                          : t("inventory.actions.archive")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {isWrittenOff ? (
                  <Badge variant="secondary" className="shrink-0">
                    {t("inventory.detail.writtenOffBadge")}
                  </Badge>
                ) : isNeedsRepair ? (
                  <Badge className="shrink-0 whitespace-pre-line border-transparent bg-red-100 text-center leading-tight text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    {t("inventory.detail.needsRepairBadge")}
                  </Badge>
                ) : isBorrowed ? (
                  <Badge variant="warning" className="shrink-0">
                    {t("inventory.detail.borrowedBadge")}
                  </Badge>
                ) : null}
                {item.archived ? (
                  <Badge variant="secondary" className="shrink-0">
                    {t("inventory.detail.archivedBadge")}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {formDirty ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="sm:h-9 sm:w-auto sm:px-4"
                  aria-label={t("inventory.actions.cancel")}
                  onClick={requestLeave}
                >
                  <X className="size-4 sm:hidden" aria-hidden />
                  <span className="hidden sm:inline">{t("inventory.actions.cancel")}</span>
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                className="sm:h-9 sm:w-auto sm:px-4"
                disabled={formBusy}
                aria-label={t("inventory.form.save")}
                onClick={() => {
                  if (!formDirty) {
                    navigateBackOrInventory()
                    return
                  }
                  const form = document.getElementById(EDIT_FORM_ID)
                  if (form instanceof HTMLFormElement) {
                    form.requestSubmit()
                  }
                }}
              >
                <Check className="size-4 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">{t("inventory.form.save")}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-[15px] pb-[20px] pt-[10px]">
        <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr] md:items-start gap-4">
          <div className="min-w-0">
            <div className="rounded-xl border bg-card">{isMdUp ? renderEditForm() : null}</div>
          </div>

          <div className="min-w-0 space-y-4">
            {renderBorrowsTable()}
            {renderRepairsTable()}
            {renderWriteOffsTable()}
            {renderQrCard()}
          </div>

          <div className="min-w-0">
            <InventoryItemTimeline
              objectId={EVENT_OBJECT_TYPE.INVENTORY_ITEM}
              entityId={item.id}
              photos={item.photos}
              className="max-h-[900px]"
            />
          </div>
        </div>

        <div className="grid gap-4 md:hidden">
          <div className="min-w-0 rounded-xl border bg-card">
            {isMdUp ? null : renderEditForm()}
          </div>

          <InventoryItemTimeline
            objectId={EVENT_OBJECT_TYPE.INVENTORY_ITEM}
            entityId={item.id}
            photos={item.photos}
          />

          {renderBorrowsTable()}
          {renderRepairsTable()}
          {renderWriteOffsTable()}
          {renderQrCard()}
        </div>
      </div>

      <Dialog
        open={unsavedPromptOpen}
        onOpenChange={(open) => {
          if (open) {
            return
          }
          stayOnPage()
        }}
      >
        <MotionDialogContent open={unsavedPromptOpen} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inventory.unsavedChanges.title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("inventory.unsavedChanges.title")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={stayOnPage}>
              {t("inventory.unsavedChanges.close")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDiscard}>
              {t("inventory.unsavedChanges.no")}
            </Button>
            <Button type="button" onClick={confirmSaveAndLeave}>
              {t("inventory.unsavedChanges.yes")}
            </Button>
          </DialogFooter>
        </MotionDialogContent>
      </Dialog>

      <Dialog
        open={archiveConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveConfirmOpen(false)
          }
        }}
      >
        <MotionDialogContent open={archiveConfirmOpen}>
          <DialogHeader>
            <DialogTitle>
              {t(
                item.archived ? "inventory.unarchiveConfirmTitle" : "inventory.archiveConfirmTitle",
                { name: item.name },
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                item.archived
                  ? "inventory.unarchiveConfirmDescription"
                  : "inventory.archiveConfirmDescription",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
              {t("inventory.actions.cancel")}
            </Button>
            <Button type="button" onClick={confirmArchiveAction}>
              {item.archived ? t("inventory.actions.unarchive") : t("inventory.actions.archive")}
            </Button>
          </DialogFooter>
        </MotionDialogContent>
      </Dialog>

      <WriteOffDialog
        item={item}
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        onConfirm={() => {
          setFormDirty(false)
          void refetch().then((result) => {
            const refreshed = result.data?.find((entry) => entry.id === id)
            if (!refreshed) {
              navigateBackOrInventory()
            }
          })
        }}
      />

      <ReturnToStockDialog
        item={item}
        open={returnToStockOpen}
        onOpenChange={setReturnToStockOpen}
        onConfirm={() => {
          navigateBackOrInventory()
        }}
      />

      <NeedsRepairDialog
        item={item}
        open={needsRepairOpen}
        onOpenChange={setNeedsRepairOpen}
        onConfirm={() => {
          setFormDirty(false)
          void refetch().then((result) => {
            const refreshed = result.data?.find((entry) => entry.id === id)
            if (!refreshed) {
              navigateBackOrInventory()
            }
          })
        }}
      />

      <RepairedConfirmDialog
        item={item}
        open={repairedConfirmOpen}
        onOpenChange={setRepairedConfirmOpen}
        onConfirm={() => {
          navigateBackOrInventory()
        }}
      />

      <BorrowDialog
        item={item}
        open={borrowOpen}
        onOpenChange={setBorrowOpen}
        onConfirm={() => {
          setFormDirty(false)
          void refetch().then((result) => {
            const refreshed = result.data?.find((entry) => entry.id === id)
            if (!refreshed) {
              navigateBackOrInventory()
            }
          })
        }}
      />

      <ReturnBorrowedDialog
        item={item}
        open={returnBorrowedOpen}
        onOpenChange={setReturnBorrowedOpen}
        onConfirm={() => {
          setFormDirty(false)
          void refetch().then((result) => {
            const refreshed = result.data?.find((entry) => entry.id === id)
            if (!refreshed) {
              navigateBackOrInventory()
            }
          })
        }}
      />
    </main>
  )
}
