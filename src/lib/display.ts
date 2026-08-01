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

/** Keep `html.standalone` + `--safe-area-bottom` in sync for PWA edge painting. */
export function syncStandaloneDisplay(isStandalone = isStandalonePwa()) {
  const root = document.documentElement
  root.classList.toggle("standalone", isStandalone)

  if (!isStandalone) {
    root.style.removeProperty("--safe-area-bottom")
    return
  }

  root.style.setProperty("--safe-area-bottom", `${readSafeAreaInsetBottom()}px`)
}
