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

  return {
    needRefresh,
    updateApp: () => {
      void updateServiceWorker(true)
    },
  }
}
