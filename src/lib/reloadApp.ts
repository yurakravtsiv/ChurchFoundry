/** Updates the service worker (if any) and reloads the document. */
export async function reloadApp(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" })
          await new Promise<void>((resolve) => {
            const onControllerChange = () => {
              navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
              resolve()
            }
            navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
            window.setTimeout(() => resolve(), 1200)
          })
        }
      }
    }
  } catch {
    // Still reload even if the service worker update check fails.
  }

  window.location.reload()
}
