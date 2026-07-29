import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router"

import { AppLayout } from "@/components/layout/AppLayout"
import { GuestRoute, ProtectedRoute } from "@/components/ProtectedRoute"
import { SplashScreen } from "@/components/SplashScreen"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { ThemeProvider, useTheme } from "@/hooks/useTheme"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { PlaceholderPage } from "@/pages/PlaceholderPage"

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
  const { isLoading: isAuthLoading } = useAuth()

  return (
    <>
      <SplashScreen isLoading={isAuthLoading} />
      <BrowserRouter>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/members" element={<PlaceholderPage titleKey="nav.members" />} />
              <Route path="/inventory" element={<PlaceholderPage titleKey="nav.inventory" />} />
              <Route path="/rooms" element={<PlaceholderPage titleKey="nav.rooms" />} />
              <Route path="/ministries" element={<PlaceholderPage titleKey="nav.ministries" />} />
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
