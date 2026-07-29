import type { Session, User } from "@supabase/supabase-js"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"

import { supabase } from "@/lib/supabase"

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) {
          return
        }
        setSession(data.session)
        setUser(data.session?.user ?? null)
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setSession(null)
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
    }),
    [user, session, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
