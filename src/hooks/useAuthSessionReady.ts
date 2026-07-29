import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

/** Resolves once the initial Supabase Auth session check completes. */
export function useAuthSessionReady() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void supabase.auth
      .getSession()
      .catch(() => {
        // Splash should still dismiss if the session check fails.
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return isLoading
}
