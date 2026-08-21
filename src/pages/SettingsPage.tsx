import { useTranslation } from "react-i18next"

import { ChurchSettingsTab } from "@/components/settings/ChurchSettingsTab"
import { GenerateDataSettingsTab } from "@/components/settings/GenerateDataSettingsTab"
import { InventorySettingsTab } from "@/components/settings/InventorySettingsTab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <h1 className="mb-4 hidden text-2xl font-semibold tracking-tight md:block">
        {t("settings.title")}
      </h1>
      <Tabs
        defaultValue="church"
        orientation="vertical"
        className="flex flex-col gap-6 md:flex-row md:items-start"
      >
        <TabsList aria-label={t("settings.title")}>
          <TabsTrigger value="church">{t("settings.tabs.church")}</TabsTrigger>
          <TabsTrigger value="inventory">{t("settings.tabs.inventory")}</TabsTrigger>
          <TabsTrigger value="generateData">{t("settings.tabs.generateData")}</TabsTrigger>
        </TabsList>
        <TabsContent value="church">
          <ChurchSettingsTab />
        </TabsContent>
        <TabsContent value="inventory">
          <InventorySettingsTab />
        </TabsContent>
        <TabsContent value="generateData">
          <GenerateDataSettingsTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
