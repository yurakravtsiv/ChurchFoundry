import { useRegisterSW } from "virtual:pwa-register/react"

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000

export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
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
  })

  const updateApp = async () => {
    console.log("updating...")
    try {
      await updateServiceWorker(true)
      console.log("done")
    } catch (error) {
      console.error("updateServiceWorker failed, falling back to reload", error)
      window.location.reload()
    }
  }

  return {
    needRefresh,
    updateApp,
  }
}
