/** True when running as an installed PWA (home-screen), not in a browser tab. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return true
    }
    if (window.matchMedia("(display-mode: fullscreen)").matches) {
      return true
    }
    if (window.matchMedia("(display-mode: minimal-ui)").matches) {
      return true
    }
  } catch {
    // ignore
  }

  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") {
    return false
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
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

/** Typical iOS home-indicator height when env() incorrectly reports 0 in standalone. */
const IOS_HOME_INDICATOR_FALLBACK_PX = 34

/** Best-effort bottom inset for painting under the home indicator in PWA mode. */
export function resolveSafeAreaInsetBottom(): number {
  const measured = readSafeAreaInsetBottom()
  if (measured > 0) {
    return measured
  }
  if (isStandalonePwa() && isIOS()) {
    return IOS_HOME_INDICATOR_FALLBACK_PX
  }
  return 0
}

/** Keep `html.standalone` in sync for CSS hooks. */
export function syncStandaloneDisplay(isStandalone = isStandalonePwa()) {
  const root = document.documentElement
  root.classList.toggle("standalone", isStandalone)

  if (!isStandalone) {
    root.style.removeProperty("--safe-area-bottom")
    return
  }

  const inset = resolveSafeAreaInsetBottom()
  root.style.setProperty("--safe-area-bottom", `${inset}px`)
}
