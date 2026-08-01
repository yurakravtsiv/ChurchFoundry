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
