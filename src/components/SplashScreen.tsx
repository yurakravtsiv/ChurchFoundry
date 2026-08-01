import { useEffect, useLayoutEffect, useState } from "react"

import { applyThemeClass, resolveTheme } from "@/lib/theme"

type SplashScreenProps = {
  isLoading: boolean
}

const MIN_VISIBLE_MS = 3000
const FADE_MS = 350
const SPLASH_BG = "#0A0A0A"

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

  // Match iOS chrome to splash black so light theme-color doesn't show as a strip.
  useEffect(() => {
    if (!opaque) {
      applyThemeClass(resolveTheme())
      return
    }

    const root = document.documentElement
    root.style.backgroundColor = SPLASH_BG
    if (document.body) {
      document.body.style.backgroundColor = SPLASH_BG
    }

    const existing = document.querySelector('meta[name="theme-color"]')
    const parent = existing?.parentElement ?? document.head
    existing?.remove()
    const meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    meta.setAttribute("content", SPLASH_BG)
    parent.appendChild(meta)
  }, [opaque])

  // Prevent iOS rubber-band while splash is visible — do not lock body with
  // position:fixed (that shifts the layer and makes the logo jump up vs the
  // native launch image).
  useLayoutEffect(() => {
    if (!mounted) {
      return
    }

    const root = document.documentElement
    root.classList.add("splash-open")

    const preventTouchScroll = (event: TouchEvent) => {
      event.preventDefault()
    }
    document.addEventListener("touchmove", preventTouchScroll, { passive: false })

    return () => {
      root.classList.remove("splash-open")
      document.removeEventListener("touchmove", preventTouchScroll)
    }
  }, [mounted])

  if (!mounted) {
    return null
  }

  return (
    <div
      className={`splash-screen fixed inset-0 z-50 bg-[#0A0A0A] transition-opacity duration-[350ms] ease-out ${
        opaque ? "opacity-100" : "opacity-0"
      }`}
      aria-busy={isLoading || !minTimeElapsed}
      aria-live="polite"
      role="status"
    >
      {/*
        Absolute 50/50 matches the native apple-touch-startup-image mark.
        No safe-area padding — that offset was causing the handoff jump.
      */}
      <div className="splash-screen__mark">
        <img
          src="/favicon.svg"
          alt="ChurchFoundry"
          width={128}
          height={128}
          className="size-32 animate-breathe select-none border-0 outline-none ring-0 shadow-none"
          draggable={false}
        />
      </div>
      <span className="sr-only">ChurchFoundry</span>
    </div>
  )
}
