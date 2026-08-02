import { useRegisterSW } from "virtual:pwa-register/react"

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000
const RELOAD_FALLBACK_MS = 1500

export function useAppUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        return
      }

      window.setInterval(() => {
        void registration.update()
      }, UPDATE_CHECK_INTERVAL_MS)
    },
    onRegisterError(error) {
      console.error("[pwa] onRegisterError", error)
    },
  })

  const dismissUpdate = () => {
    setNeedRefresh(false)
  }

  const updateApp = async () => {
    // Hide the banner immediately; reload continues in the background.
    setNeedRefresh(false)

    // Schedule immediately so a hung activation (e.g. other tabs holding the old SW)
    // still reloads this tab after ~1.5s.
    const fallbackId = window.setTimeout(() => {
      window.location.reload()
    }, RELOAD_FALLBACK_MS)

    try {
      await updateServiceWorker(true)
    } catch (error) {
      console.error("[pwa] updateServiceWorker failed, reloading now", error)
      window.clearTimeout(fallbackId)
      window.location.reload()
    }
  }

  return {
    needRefresh,
    updateApp,
    dismissUpdate,
  }
}
