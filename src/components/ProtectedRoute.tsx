import { Navigate, Outlet, useLocation, useSearchParams } from "react-router"

import { useAuth } from "@/hooks/useAuth"
import { getSafeRedirectPath } from "@/lib/safeRedirect"

/** Requires an authenticated session. Redirects to /login otherwise. */
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (!session) {
    const next = `${location.pathname}${location.search}`
    const search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""
    return <Navigate to={`/login${search}`} replace />
  }

  return <Outlet />
}

/** Public auth screens only. Redirects authenticated users home. */
export function GuestRoute() {
  const { session, isLoading } = useAuth()
  const [searchParams] = useSearchParams()

  if (isLoading) {
    return null
  }

  if (session) {
    return <Navigate to={getSafeRedirectPath(searchParams.get("next")) ?? "/"} replace />
  }

  return <Outlet />
}
