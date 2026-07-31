import { useEffect, useState } from "react"

type SplashScreenProps = {
  isLoading: boolean
}

const MIN_VISIBLE_MS = 3000
const FADE_MS = 350

export function SplashScreen({ isLoading }: SplashScreenProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [opaque, setOpaque] = useState(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMinTimeElapsed(true)
    }, MIN_VISIBLE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const canHide = !isLoading && minTimeElapsed

    if (!canHide) {
      setMounted(true)
      setOpaque(true)
      return
    }

    setOpaque(false)
    const timeoutId = window.setTimeout(() => {
      setMounted(false)
    }, FADE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isLoading, minTimeElapsed])

  if (!mounted) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex h-dvh min-h-dvh w-full items-center justify-center bg-[#0A0A0A] transition-opacity duration-[350ms] ease-out ${
        opaque ? "opacity-100" : "opacity-0"
      }`}
      aria-busy={isLoading || !minTimeElapsed}
      aria-live="polite"
      role="status"
    >
      <img
        src="/favicon.svg"
        alt="ChurchFoundry"
        width={128}
        height={128}
        className="size-32 animate-breathe select-none border-0 outline-none ring-0 shadow-none"
        draggable={false}
      />
      <span className="sr-only">ChurchFoundry</span>
    </div>
  )
}
