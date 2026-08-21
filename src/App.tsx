import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router"

import { AppLayout } from "@/components/layout/AppLayout"
import { GuestRoute, ProtectedRoute } from "@/components/ProtectedRoute"
import { UpdateBanner } from "@/components/UpdateBanner"
import { AuthProvider } from "@/hooks/useAuth"
import { useStandalonePwa } from "@/hooks/useStandalonePwa"
import { ThemeProvider, useTheme } from "@/hooks/useTheme"
import { syncStandaloneDisplay } from "@/lib/display"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { InventoryItemDetailPage } from "@/pages/InventoryItemDetailPage"
import { InventoryPage } from "@/pages/InventoryPage"
import { LoginPage } from "@/pages/LoginPage"
import { SettingsPage } from "@/pages/SettingsPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/people" element={<ComingSoonPage />} />
          <Route path="/services" element={<ComingSoonPage />} />
          <Route path="/calendar" element={<ComingSoonPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/:id" element={<InventoryItemDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </>,
  ),
)

function AppShell() {
  // Keep theme state mounted at the app root (syncs with FOWT inline script).
  useTheme()
  const isStandalone = useStandalonePwa()

  useEffect(() => {
    syncStandaloneDisplay(isStandalone)
    const rafId = window.requestAnimationFrame(() => syncStandaloneDisplay(isStandalone))
    const timeoutId = window.setTimeout(() => syncStandaloneDisplay(isStandalone), 100)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [isStandalone])

  return (
    <>
      <UpdateBanner />
      <RouterProvider router={router} />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
