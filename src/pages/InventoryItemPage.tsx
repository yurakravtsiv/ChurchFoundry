import { Package } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router"

import { getInventoryItemById } from "@/lib/inventoryStorage"

/** Temporary detail stub — full item page comes in a later step. */
export function InventoryItemPage() {
  const { t } = useTranslation()
  const { itemId } = useParams()
  const item = itemId ? getInventoryItemById(itemId) : undefined

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] w-full flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <Package
        className="mb-6 size-24 animate-breathe text-muted-foreground sm:size-28 md:size-32"
        strokeWidth={1.25}
        aria-hidden
      />
      <p className="text-2xl font-medium tracking-tight text-muted-foreground sm:text-3xl">
        {item ? item.name : t("inventory.itemNotFound")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t("nav.inDevelopment")}</p>
    </main>
  )
}
