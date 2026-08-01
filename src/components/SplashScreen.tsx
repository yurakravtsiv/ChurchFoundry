import { useEffect, useLayoutEffect, useState } from "react"

import { applyThemeClass, resolveTheme } from "@/lib/theme"

type SplashScreenProps = {
  isLoading: boolean
}

const MIN_VISIBLE_MS = 3000
const FADE_MS = 350
const SPLASH_BG = "#0A0A0A"

function readSafeAreaInsetBottom(): number {
  const probe = document.createElement("div")
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)"
  document.body.appendChild(probe)
  const inset = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0
  probe.remove()
  return inset
}

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

  // Lock document scroll/overscroll while splash is up — iOS rubber-band
  // otherwise shifts the "centered" logo when the layer is short by the home indicator.
  useLayoutEffect(() => {
    if (!mounted) {
      return
    }

    const root = document.documentElement
    const body = document.body
    const scrollY = window.scrollY

    const syncShift = () => {
      root.style.setProperty("--splash-shift", `${readSafeAreaInsetBottom()}px`)
    }

    root.classList.add("splash-open")
    syncShift()
    // iOS often reports 0 on the first paint, then updates the inset.
    const rafId = window.requestAnimationFrame(syncShift)
    const timeoutId = window.setTimeout(syncShift, 100)

    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"

    const preventTouchScroll = (event: TouchEvent) => {
      event.preventDefault()
    }
    document.addEventListener("touchmove", preventTouchScroll, { passive: false })

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      root.classList.remove("splash-open")
      root.style.removeProperty("--splash-shift")
      body.style.position = ""
      body.style.top = ""
      body.style.left = ""
      body.style.right = ""
      body.style.width = ""
      document.removeEventListener("touchmove", preventTouchScroll)
      window.scrollTo(0, scrollY)
    }
  }, [mounted])

  if (!mounted) {
    return null
  }

  return (
    <div
      className={`splash-screen fixed z-50 flex items-center justify-center bg-[#0A0A0A] transition-opacity duration-[350ms] ease-out ${
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
