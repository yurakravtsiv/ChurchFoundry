import { ArrowLeft, PackageX } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBlocker, useNavigate, useParams } from "react-router"

import { InventoryItemForm } from "@/components/inventory/InventoryItemForm"
import { ItemQrCode } from "@/components/inventory/ItemQrCode"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getInventoryItemById, updateInventoryItem } from "@/lib/inventoryStorage"
import type { InventoryItem } from "@/types/inventory"

const EDIT_FORM_ID = "inventory-item-edit-form"

type UnsavedPrompt = "save" | "cancel"

export function InventoryItemDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [item, setItem] = useState<InventoryItem | undefined>(() =>
    id ? getInventoryItemById(id) : undefined,
  )
  const [formDirty, setFormDirty] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [unsavedPrompt, setUnsavedPrompt] = useState<UnsavedPrompt | null>(null)
  const allowLeaveRef = useRef(false)
  const leaveAfterSaveRef = useRef(false)
  const pendingLeaveToRef = useRef<string | null>(null)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeaveRef.current && formDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    setItem(id ? getInventoryItemById(id) : undefined)
    setFormDirty(false)
    allowLeaveRef.current = false
  }, [id])

  useEffect(() => {
    if (blocker.state === "blocked") {
      setUnsavedPrompt("save")
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

  const goBackToInventory = () => {
    navigate("/inventory")
  }

  const requestLeave = () => {
    if (formDirty) {
      setUnsavedPrompt("save")
      return
    }
    goBackToInventory()
  }

  const requestCancel = () => {
    if (formDirty) {
      setUnsavedPrompt("cancel")
      return
    }
    goBackToInventory()
  }

  const stayOnPage = () => {
    leaveAfterSaveRef.current = false
    pendingLeaveToRef.current = null
    setUnsavedPrompt(null)
    if (blocker.state === "blocked") {
      blocker.reset()
    }
  }

  const confirmDiscard = () => {
    leaveAfterSaveRef.current = false
    pendingLeaveToRef.current = null
    allowLeaveRef.current = true
    setUnsavedPrompt(null)
    setFormDirty(false)
    if (blocker.state === "blocked") {
      blocker.proceed()
      return
    }
    goBackToInventory()
  }

  const confirmSaveAndLeave = () => {
    if (blocker.state === "blocked") {
      pendingLeaveToRef.current = `${blocker.location.pathname}${blocker.location.search}`
      blocker.reset()
    } else {
      pendingLeaveToRef.current = "/inventory"
    }
    leaveAfterSaveRef.current = true
    setUnsavedPrompt(null)
    const form = document.getElementById(EDIT_FORM_ID)
    if (form instanceof HTMLFormElement) {
      form.requestSubmit()
    }
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
        <Button type="button" className="mt-6" onClick={goBackToInventory}>
          {t("inventory.detail.returnToInventory")}
        </Button>
      </main>
    )
  }

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight sm:text-3xl">
              {item.name}
            </h1>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {formDirty ? (
                <Button type="button" variant="outline" onClick={requestCancel}>
                  {t("inventory.actions.cancel")}
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={formBusy}
                onClick={() => {
                  if (!formDirty) {
                    goBackToInventory()
                    return
                  }
                  const form = document.getElementById(EDIT_FORM_ID)
                  if (form instanceof HTMLFormElement) {
                    form.requestSubmit()
                  }
                }}
              >
                {t("inventory.form.save")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-[15px] py-[10px] md:grid-cols-3 md:items-start">
        <div className="min-w-0 rounded-xl border bg-card md:col-span-2">
          <InventoryItemForm
            key={item.updatedAt}
            id={EDIT_FORM_ID}
            mode="edit"
            layout="page"
            initialData={item}
            onBusyChange={setFormBusy}
            onDirtyChange={setFormDirty}
            onCancel={requestCancel}
            onInvalid={() => {
              leaveAfterSaveRef.current = false
              pendingLeaveToRef.current = null
            }}
            onSubmit={(data) => {
              const updated = updateInventoryItem(item.id, data)
              if (!updated) {
                leaveAfterSaveRef.current = false
                pendingLeaveToRef.current = null
                return
              }
              leaveAfterSaveRef.current = false
              allowLeaveRef.current = true
              setFormDirty(false)
              const next = pendingLeaveToRef.current ?? "/inventory"
              pendingLeaveToRef.current = null
              navigate(next)
            }}
          />
        </div>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t("inventory.detail.qrTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ItemQrCode value={item.qrCodeValue} itemName={item.name} itemId={item.id} size={200} />
            <CardDescription className="text-center">
              {t("inventory.detail.qrHint")}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={unsavedPrompt !== null}
        onOpenChange={(open) => {
          if (open) {
            return
          }
          stayOnPage()
        }}
      >
        <DialogContent className="max-w-sm">
          {unsavedPrompt === "cancel" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("inventory.unsavedChanges.cancelTitle")}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t("inventory.unsavedChanges.cancelTitle")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={stayOnPage}>
                  {t("inventory.unsavedChanges.close")}
                </Button>
                <Button type="button" variant="destructive" onClick={confirmDiscard}>
                  {t("inventory.unsavedChanges.cancelConfirm")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("inventory.unsavedChanges.title")}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t("inventory.unsavedChanges.title")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
