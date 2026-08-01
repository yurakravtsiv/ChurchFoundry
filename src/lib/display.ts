/** True when running as an installed PWA (home-screen), not in a browser tab. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return true
    }
  } catch {
    // ignore
  }

  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

/** Measured `env(safe-area-inset-bottom)` in CSS pixels (0 when unavailable). */
export function readSafeAreaInsetBottom(): number {
  if (typeof document === "undefined") {
    return 0
  }

  const probe = document.createElement("div")
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)"
  document.body.appendChild(probe)
  const inset = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0
  probe.remove()
  return inset
}

/** Keep `html.standalone` in sync. Only set --safe-area-bottom when measured > 0
 *  (setting 0px would override CSS `env()` fallbacks and kill the strip fill). */
export function syncStandaloneDisplay(isStandalone = isStandalonePwa()) {
  const root = document.documentElement
  root.classList.toggle("standalone", isStandalone)

  if (!isStandalone) {
    root.style.removeProperty("--safe-area-bottom")
    return
  }

  const inset = readSafeAreaInsetBottom()
  if (inset > 0) {
    root.style.setProperty("--safe-area-bottom", `${inset}px`)
  } else {
    root.style.removeProperty("--safe-area-bottom")
  }
}
