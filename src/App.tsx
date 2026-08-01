import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router"

import { AppLayout } from "@/components/layout/AppLayout"
import { GuestRoute, ProtectedRoute } from "@/components/ProtectedRoute"
import { UpdateBanner } from "@/components/UpdateBanner"
import { AuthProvider } from "@/hooks/useAuth"
import { useStandalonePwa } from "@/hooks/useStandalonePwa"
import { ThemeProvider, useTheme } from "@/hooks/useTheme"
import { syncStandaloneDisplay } from "@/lib/display"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { HomePage } from "@/pages/HomePage"
import { InventoryItemDetailPage } from "@/pages/InventoryItemDetailPage"
import { InventoryPage } from "@/pages/InventoryPage"
import { LoginPage } from "@/pages/LoginPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

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
      <BrowserRouter>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/people" element={<ComingSoonPage />} />
              <Route path="/services" element={<ComingSoonPage />} />
              <Route path="/calendar" element={<ComingSoonPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/:id" element={<InventoryItemDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
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
