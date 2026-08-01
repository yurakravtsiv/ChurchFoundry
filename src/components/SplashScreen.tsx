import { useEffect, useState } from "react"

import { applyThemeClass, resolveTheme } from "@/lib/theme"

type SplashScreenProps = {
  /** When true, start (or keep) the splash sequence. */
  active: boolean
  onFinished?: () => void
}

const MIN_VISIBLE_MS = 3000
const FADE_MS = 350
/** Light system-style splash (matches default iOS launch canvas). */
const SPLASH_BG = "#FFFFFF"

export function SplashScreen({ active, onFinished }: SplashScreenProps) {
  const [mounted, setMounted] = useState(false)
  const [opaque, setOpaque] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    if (!active) {
      setMounted(false)
      setOpaque(false)
      setMinTimeElapsed(false)
      return
    }

    setMounted(true)
    setOpaque(true)
    setMinTimeElapsed(false)

    const timeoutId = window.setTimeout(() => {
      setMinTimeElapsed(true)
    }, MIN_VISIBLE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [active])

  useEffect(() => {
    if (!active || !mounted || !minTimeElapsed) {
      return
    }

    setOpaque(false)
    const timeoutId = window.setTimeout(() => {
      setMounted(false)
      onFinished?.()
    }, FADE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [active, mounted, minTimeElapsed, onFinished])

  // Keep status-bar / home-indicator chrome light while splash is up.
  useEffect(() => {
    if (!mounted) {
      return
    }

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
  }, [mounted, opaque])

  if (!mounted) {
    return null
  }

  return (
    <div
      className={`splash-screen fixed inset-0 z-50 bg-white transition-opacity duration-[350ms] ease-out ${
        opaque ? "opacity-100" : "opacity-0"
      }`}
      aria-busy={!minTimeElapsed}
      aria-live="polite"
      role="status"
    >
      <div className="splash-screen__mark">
        {/*
          apple-touch-startup-image assets place the mark at ~39% of device width
          (~154 CSS px on modern iPhones). Match that so the handoff is seamless.
        */}
        <img
          src="/splash_screens/icon.png"
          alt="ChurchFoundry"
          width={154}
          height={154}
          className="size-[min(39vw,157px)] animate-splash-breathe select-none border-0 outline-none ring-0 shadow-none"
          draggable={false}
        />
      </div>
      <span className="sr-only">ChurchFoundry</span>
    </div>
  )
}
