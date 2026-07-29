import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  applyThemeClass,
  getStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme())

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      // Only follow the system when the user has no manual preference.
      if (getStoredTheme() !== null) {
        return
      }
      setThemeState(event.matches ? "dark" : "light")
    }

    media.addEventListener("change", onSystemThemeChange)
    return () => {
      media.removeEventListener("change", onSystemThemeChange)
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Ignore quota / private-mode errors; still apply in-memory.
    }
    setThemeState(next)
    applyThemeClass(next)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
