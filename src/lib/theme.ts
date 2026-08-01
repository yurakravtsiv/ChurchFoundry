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

  // Disable CSS transitions/animations for one frame so theme colors snap instantly.
  root.classList.add("theme-switching")

  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme

  // Keep inline colors in sync with theme toggles (FOWT sets these before React mounts).
  const themeColor = theme === "dark" ? "#0A0A0A" : "#FAFAFA"
  root.style.backgroundColor = themeColor
  if (document.body) {
    document.body.style.backgroundColor = themeColor
  }

  // iOS/PWA often caches theme-color; recreate the meta tag so the safe-area chrome updates live.
  const existing = document.querySelector('meta[name="theme-color"]')
  const parent = existing?.parentElement ?? document.head
  existing?.remove()
  const meta = document.createElement("meta")
  meta.setAttribute("name", "theme-color")
  meta.setAttribute("content", themeColor)
  parent.appendChild(meta)

  // Force style flush, then re-enable transitions on the next frames.
  void root.offsetHeight
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove("theme-switching")
    })
  })
}
