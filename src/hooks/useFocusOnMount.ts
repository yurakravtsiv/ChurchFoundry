import { useEffect, useRef } from "react"

/** Focus ref.current once after mount when enabled. */
export function useFocusOnMount<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }
    const frame = requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [enabled])

  return ref
}

/** Focus ref.current whenever `open` becomes true. */
export function useFocusOnOpen<T extends HTMLElement>(open: boolean, enabled = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!open || !enabled) {
      return
    }
    const frame = requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, enabled])

  return ref
}
