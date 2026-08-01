import { useSyncExternalStore } from "react"

import { isStandalonePwa } from "@/lib/display"

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)")
  media.addEventListener("change", onStoreChange)
  return () => {
    media.removeEventListener("change", onStoreChange)
  }
}

/** Installed PWA / home-screen mode (not a regular mobile browser tab). */
export function useStandalonePwa() {
  return useSyncExternalStore(subscribe, isStandalonePwa, () => false)
}
