import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router"

import { SplashScreen } from "@/components/SplashScreen"
import { useAuthSessionReady } from "@/hooks/useAuthSessionReady"
import { ThemeProvider, useTheme } from "@/hooks/useTheme"
import { HomePage } from "@/pages/HomePage"

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
  const isAuthLoading = useAuthSessionReady()

  return (
    <>
      <SplashScreen isLoading={isAuthLoading} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
