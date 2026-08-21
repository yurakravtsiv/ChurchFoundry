import { AppShell } from "@/components/layout/AppLayout"
import { useAuth } from "@/hooks/useAuth"
import { InventoryItemDetailPage } from "@/pages/InventoryItemDetailPage"
import { PublicChurchPage } from "@/pages/PublicChurchPage"

export function InventoryItemAccess() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!session) {
    return <PublicChurchPage />
  }

  return (
    <AppShell>
      <InventoryItemDetailPage />
    </AppShell>
  )
}
