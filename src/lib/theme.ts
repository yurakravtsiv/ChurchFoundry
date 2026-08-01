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

export function themeColorHex(theme: Theme) {
  return theme === "dark" ? "#0A0A0A" : "#FAFAFA"
}

/** Sync html/body/#root + theme-color meta (Android / older iOS Safari). */
export function syncBrowserChrome(theme: Theme) {
  const themeColor = themeColorHex(theme)
  const root = document.documentElement

  root.style.backgroundColor = themeColor
  if (document.body) {
    document.body.style.backgroundColor = themeColor
  }
  const appRoot = document.getElementById("root")
  if (appRoot) {
    appRoot.style.backgroundColor = themeColor
  }

  // iOS/PWA often caches theme-color; recreate the meta tag so chrome updates.
  document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
    node.remove()
  })
  const meta = document.createElement("meta")
  meta.setAttribute("name", "theme-color")
  meta.setAttribute("content", themeColor)
  document.head.appendChild(meta)

  // Some WebKits only notice a content write after a blank frame.
  meta.setAttribute("content", "")
  void root.offsetHeight
  meta.setAttribute("content", themeColor)
}

export function applyThemeClass(theme: Theme) {
  const root = document.documentElement

  // Disable CSS transitions/animations for one frame so theme colors snap instantly.
  root.classList.add("theme-switching")

  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme

  syncBrowserChrome(theme)

  // Force style flush, then re-enable transitions on the next frames.
  void root.offsetHeight
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove("theme-switching")
    })
  })
}
