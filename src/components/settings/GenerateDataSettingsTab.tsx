import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { inventoryQueryKeys } from "@/hooks/queries/useInventoryQueries"
import { useAuth } from "@/hooks/useAuth"
import { generateSeedData, SEED_ITEM_COUNT } from "@/lib/inventoryDataGenerator"

export function GenerateDataSettingsTab() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isGenerating, setIsGenerating] = useState(false)
  const userEmail = user?.email ?? ""

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      generateSeedData(userEmail)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.categories }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.subcategories }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.locations }),
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lookups }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1.5 px-4 py-4">
        <CardTitle className="text-base">{t("settings.generateData.title")}</CardTitle>
        <CardDescription>
          {t("settings.generateData.description", { count: SEED_ITEM_COUNT })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end px-4 pb-4 pt-0">
        <Button type="button" disabled={isGenerating} onClick={() => void handleGenerate()}>
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("settings.generateData.generating")}
            </>
          ) : (
            t("settings.generateData.confirm")
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
