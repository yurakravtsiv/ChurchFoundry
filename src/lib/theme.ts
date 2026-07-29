export const THEME_STORAGE_KEY = "churchfoundry-theme"

export type Theme = "light" | "dark"

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark"
}

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

export function getSystemTheme(): Theme | null {
  try {
    if (typeof window.matchMedia !== "function") {
      return null
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    if (typeof media.matches !== "boolean") {
      return null
    }
    return media.matches ? "dark" : "light"
  } catch {
    return null
  }
}

/** Priority: localStorage → prefers-color-scheme → dark */
export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme() ?? "dark"
}

export function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme
}
