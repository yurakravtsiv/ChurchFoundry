import { useRegisterSW } from "virtual:pwa-register/react"

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000
const RELOAD_FALLBACK_MS = 1500

export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("[pwa] onRegisteredSW", { swUrl, scope: registration?.scope })
      if (!registration) {
        return
      }

      window.setInterval(() => {
        console.log("[pwa] periodic registration.update()")
        void registration.update()
      }, UPDATE_CHECK_INTERVAL_MS)
    },
    onNeedRefresh() {
      console.log("[pwa] onNeedRefresh — update available")
    },
    onOfflineReady() {
      console.log("[pwa] onOfflineReady")
    },
    onRegisterError(error) {
      console.error("[pwa] onRegisterError", error)
    },
  })

  const updateApp = async () => {
    console.log("[pwa] updateApp: before updateServiceWorker(true)")

    // Schedule immediately so a hung activation (e.g. other tabs holding the old SW)
    // still reloads this tab after ~1.5s.
    const fallbackId = window.setTimeout(() => {
      console.log("[pwa] updateApp: fallback reload after timeout")
      window.location.reload()
    }, RELOAD_FALLBACK_MS)

    try {
      await updateServiceWorker(true)
      console.log("[pwa] updateApp: after updateServiceWorker(true)")
    } catch (error) {
      console.error("[pwa] updateServiceWorker failed, reloading now", error)
      window.clearTimeout(fallbackId)
      window.location.reload()
    }
  }

  return {
    needRefresh,
    updateApp,
  }
}
