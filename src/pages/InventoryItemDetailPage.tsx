import { ArrowLeft, PackageX } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router"

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

const SAVED_FEEDBACK_MS = 1600

export function InventoryItemDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [item, setItem] = useState<InventoryItem | undefined>(() =>
    id ? getInventoryItemById(id) : undefined,
  )
  const [formDirty, setFormDirty] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const savedTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setItem(id ? getInventoryItemById(id) : undefined)
    setFormDirty(false)
    setShowSaved(false)
  }, [id])

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  const goBackToInventory = () => {
    navigate("/inventory")
  }

  const requestCancel = () => {
    if (formDirty) {
      setDiscardOpen(true)
      return
    }
    goBackToInventory()
  }

  const confirmDiscard = () => {
    setDiscardOpen(false)
    setFormDirty(false)
    goBackToInventory()
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
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 bg-background px-4 py-6 sm:px-6 md:py-8">
      <div className="space-y-4">
        <Link
          to="/inventory"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("inventory.detail.backToInventory")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{item.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3 md:items-start">
        <div className="overflow-hidden rounded-xl border bg-card md:col-span-2">
          <InventoryItemForm
            key={item.updatedAt}
            mode="edit"
            initialData={item}
            submitLabel={showSaved ? t("inventory.detail.saved") : undefined}
            onDirtyChange={(dirty) => {
              setFormDirty(dirty)
              if (dirty) {
                setShowSaved(false)
              }
            }}
            onCancel={requestCancel}
            onSubmit={(data) => {
              const updated = updateInventoryItem(item.id, data)
              if (!updated) {
                return
              }
              setItem(updated)
              setFormDirty(false)
              setShowSaved(true)
              if (savedTimeoutRef.current !== null) {
                window.clearTimeout(savedTimeoutRef.current)
              }
              savedTimeoutRef.current = window.setTimeout(() => {
                setShowSaved(false)
                savedTimeoutRef.current = null
              }, SAVED_FEEDBACK_MS)
            }}
          />
        </div>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t("inventory.detail.qrTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ItemQrCode value={item.qrCodeValue} size={200} />
            <CardDescription className="text-center">
              {t("inventory.detail.qrHint")}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inventory.detail.discardTitle")}</DialogTitle>
            <DialogDescription>{t("inventory.detail.discardDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDiscardOpen(false)}>
              {t("inventory.detail.discardStay")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDiscard}>
              {t("inventory.detail.discardConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
