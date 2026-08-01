import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const PULL_THRESHOLD_PX = 80
const MAX_PULL_PX = 120
const INDICATOR_MAX_PX = 56
const SETTLE_MS = 200
/** Degrees of rotation per pixel of finger travel (~full turn every 180px). */
const ROTATION_DEG_PER_PX = 360 / 180

/** Theme background — same token as html/body (not a hardcoded hex). */
const themeBackgroundStyle = { backgroundColor: "hsl(var(--background))" } as const

type PullToRefreshProps = {
  children: ReactNode
  onRefresh?: () => void | Promise<void>
  className?: string
}

async function defaultRefresh() {
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
  // Keep the spinning indicator up until the document is torn down.
  await new Promise<void>(() => {})
}

function pullOpacity(distance: number, refreshing: boolean) {
  return refreshing ? 1 : Math.min(1, distance / 36)
}

export function PullToRefresh({
  children,
  onRefresh = defaultRefresh,
  className,
}: PullToRefreshProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLImageElement>(null)
  const startYRef = useRef(0)
  const lastYRef = useRef(0)
  const pullingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const rotationRef = useRef(0)
  const refreshingRef = useRef(false)
  const settleTimerRef = useRef<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  /** True only while animating release/snap — never during an active drag. */
  const [settling, setSettling] = useState(false)

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
  }, [])

  const beginSettle = useCallback(() => {
    clearSettleTimer()
    setSettling(true)
    settleTimerRef.current = window.setTimeout(() => {
      setSettling(false)
      settleTimerRef.current = null
    }, SETTLE_MS)
  }, [clearSettleTimer])

  /** Apply drag visuals immediately (no React render lag, no CSS transition). */
  const paintPull = useCallback((distance: number, rotationDeg: number) => {
    const content = contentRef.current
    const indicator = indicatorRef.current
    const icon = iconRef.current
    if (content) {
      content.style.transition = "none"
      content.style.transform = `translateY(${distance}px)`
    }
    if (indicator) {
      indicator.style.transition = "none"
      indicator.style.opacity = String(pullOpacity(distance, refreshingRef.current))
    }
    if (icon && !refreshingRef.current) {
      icon.style.transform = `rotate(${rotationDeg}deg)`
    }
  }, [])

  const resetGesture = useCallback(() => {
    pullDistanceRef.current = 0
    rotationRef.current = 0
    setPullDistance(0)
    paintPull(0, 0)
  }, [paintPull])

  const runRefresh = useCallback(async () => {
    refreshingRef.current = true
    setRefreshing(true)
    pullDistanceRef.current = INDICATOR_MAX_PX
    setPullDistance(INDICATOR_MAX_PX)
    // Lock indicator fully visible while the page reloads.
    if (indicatorRef.current) {
      indicatorRef.current.style.transition = `opacity ${SETTLE_MS}ms ease-out`
      indicatorRef.current.style.opacity = "1"
    }
    if (contentRef.current) {
      contentRef.current.style.transition = `transform ${SETTLE_MS}ms ease-out`
      contentRef.current.style.transform = `translateY(${INDICATOR_MAX_PX}px)`
    }
    // Clear drag rotation so CSS spin can take over cleanly.
    if (iconRef.current) {
      iconRef.current.style.transform = ""
    }
    beginSettle()
    try {
      await onRefresh()
      // Custom onRefresh that does not reload — hide the indicator.
      refreshingRef.current = false
      setRefreshing(false)
      beginSettle()
      resetGesture()
    } catch {
      refreshingRef.current = false
      setRefreshing(false)
      beginSettle()
      resetGesture()
    }
  }, [beginSettle, onRefresh, resetGesture])

  useEffect(() => {
    return () => {
      clearSettleTimer()
    }
  }, [clearSettleTimer])

  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 0) {
        pullingRef.current = false
        return
      }
      const y = event.touches[0]?.clientY ?? 0
      startYRef.current = y
      lastYRef.current = y
      rotationRef.current = 0
      clearSettleTimer()
      setSettling(false)
      paintPull(pullDistanceRef.current, 0)
      pullingRef.current = true
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current) {
        return
      }

      // Mid-page scroll must stay native — abort pull gesture.
      if (el.scrollTop > 0) {
        pullingRef.current = false
        if (pullDistanceRef.current !== 0 || rotationRef.current !== 0) {
          resetGesture()
        }
        return
      }

      const currentY = event.touches[0]?.clientY ?? 0
      const moveDelta = currentY - lastYRef.current
      lastYRef.current = currentY

      // Clockwise when finger moves down, counter-clockwise when moving up.
      if (moveDelta !== 0) {
        rotationRef.current += moveDelta * ROTATION_DEG_PER_PX
      }

      const deltaFromStart = currentY - startYRef.current
      if (deltaFromStart <= 0) {
        if (pullDistanceRef.current !== 0) {
          pullDistanceRef.current = 0
          setPullDistance(0)
          paintPull(0, rotationRef.current)
        } else {
          paintPull(0, rotationRef.current)
        }
        return
      }

      // Resist overscroll past the max pull distance.
      const next = Math.min(deltaFromStart * 0.55, MAX_PULL_PX)
      pullDistanceRef.current = next
      setPullDistance(next)
      paintPull(next, rotationRef.current)

      // Block native bounce only while actively pulling from the top.
      if (next > 0) {
        event.preventDefault()
      }
    }

    const onTouchEnd = () => {
      if (!pullingRef.current) {
        return
      }
      pullingRef.current = false

      const distance = pullDistanceRef.current
      if (distance >= PULL_THRESHOLD_PX && !refreshingRef.current) {
        void runRefresh()
        return
      }

      beginSettle()
      resetGesture()
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    el.addEventListener("touchcancel", onTouchEnd)

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [beginSettle, clearSettleTimer, paintPull, resetGesture, runRefresh])

  const contentOffset = refreshing ? INDICATOR_MAX_PX : pullDistance
  const readyToRefresh = pullDistance >= PULL_THRESHOLD_PX
  const indicatorOpacity = pullOpacity(contentOffset, refreshing)
  const showIndicator = indicatorOpacity > 0.02 || refreshing
  const contentTransition = settling ? `transform ${SETTLE_MS}ms ease-out` : "none"
  const indicatorTransition = settling ? `opacity ${SETTLE_MS}ms ease-out` : "none"

  return (
    // Shell fills the flex slot and always paints theme bg (incl. under home indicator).
    <div
      className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col bg-background", className)}
      style={themeBackgroundStyle}
    >
      {/* Scrollport — same theme bg so iOS rubber-band does not flash a default color */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-background"
        style={themeBackgroundStyle}
      >
        {/* Overlay indicator — always above content; fades as the pull collapses. */}
        <div
          ref={indicatorRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-2"
          style={{
            opacity: indicatorOpacity,
            transition: indicatorTransition,
          }}
          aria-hidden={!showIndicator}
        >
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-full bg-black shadow-sm",
              readyToRefresh && !refreshing && "scale-110",
              refreshing && "scale-100",
            )}
            role="status"
            aria-live="polite"
            aria-label={refreshing ? t("refresh.refreshing") : t("refresh.pull")}
          >
            <img
              ref={iconRef}
              src="/favicon.svg"
              alt=""
              width={24}
              height={24}
              draggable={false}
              className={cn(
                "size-6 select-none",
                refreshing && "animate-spin [animation-duration:0.8s]",
              )}
            />
          </div>
        </div>

        <div
          ref={contentRef}
          className="min-h-full bg-background will-change-transform"
          style={{
            ...themeBackgroundStyle,
            transform: `translateY(${contentOffset}px)`,
            transition: contentTransition,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
