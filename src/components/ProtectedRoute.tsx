import { Navigate, Outlet } from "react-router"

import { useAuth } from "@/hooks/useAuth"

/** Requires an authenticated session. Redirects to /login otherwise. */
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

/** Public auth screens only. Redirects authenticated users home. */
export function GuestRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
