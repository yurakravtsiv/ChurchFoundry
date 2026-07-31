import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const PULL_THRESHOLD_PX = 80
const MAX_PULL_PX = 120
const INDICATOR_MAX_PX = 56
/** Degrees of rotation per pixel of finger travel (~full turn every 180px). */
const ROTATION_DEG_PER_PX = 360 / 180

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
  } finally {
    window.location.reload()
  }
}

export function PullToRefresh({
  children,
  onRefresh = defaultRefresh,
  className,
}: PullToRefreshProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const lastYRef = useRef(0)
  const pullingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const rotationRef = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const resetGesture = useCallback(() => {
    pullDistanceRef.current = 0
    rotationRef.current = 0
    setPullDistance(0)
    setRotation(0)
  }, [])

  const runRefresh = useCallback(async () => {
    setRefreshing(true)
    setPullDistance(INDICATOR_MAX_PX)
    try {
      await onRefresh()
    } finally {
      // If onRefresh did not reload the page, hide the indicator.
      setRefreshing(false)
      resetGesture()
    }
  }, [onRefresh, resetGesture])

  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || el.scrollTop > 0) {
        pullingRef.current = false
        return
      }
      const y = event.touches[0]?.clientY ?? 0
      startYRef.current = y
      lastYRef.current = y
      rotationRef.current = 0
      setRotation(0)
      pullingRef.current = true
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshing) {
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
      // No continuous animation — angle only changes while touchmove fires.
      if (moveDelta !== 0) {
        rotationRef.current += moveDelta * ROTATION_DEG_PER_PX
        setRotation(rotationRef.current)
      }

      const deltaFromStart = currentY - startYRef.current
      if (deltaFromStart <= 0) {
        if (pullDistanceRef.current !== 0) {
          pullDistanceRef.current = 0
          setPullDistance(0)
        }
        return
      }

      // Resist overscroll past the max pull distance.
      const next = Math.min(deltaFromStart * 0.55, MAX_PULL_PX)
      pullDistanceRef.current = next
      setPullDistance(next)

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
      if (distance >= PULL_THRESHOLD_PX && !refreshing) {
        void runRefresh()
        return
      }

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
  }, [refreshing, resetGesture, runRefresh])

  const indicatorHeight = refreshing ? INDICATOR_MAX_PX : Math.min(pullDistance, INDICATOR_MAX_PX)
  const readyToRefresh = pullDistance >= PULL_THRESHOLD_PX
  const showIndicator = indicatorHeight > 4 || refreshing

  return (
    <div
      ref={containerRef}
      className={cn("bg-background pb-[env(safe-area-inset-bottom,0px)]", className)}
    >
      <div
        className="pointer-events-none flex justify-center overflow-hidden transition-[height,opacity] duration-200 ease-out"
        style={{
          height: indicatorHeight,
          opacity: showIndicator ? 1 : 0,
        }}
        aria-hidden={!showIndicator}
      >
        <div
          className={cn(
            "mt-2 flex size-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-transform duration-200",
            readyToRefresh && !refreshing && "scale-110",
          )}
          role="status"
          aria-live="polite"
          aria-label={refreshing ? t("refresh.refreshing") : t("refresh.pull")}
        >
          <img
            src="/favicon.svg"
            alt=""
            width={24}
            height={24}
            draggable={false}
            className={cn("size-6 select-none", refreshing && "animate-spin")}
            style={refreshing ? undefined : { transform: `rotate(${rotation}deg)` }}
          />
        </div>
      </div>

      {children}
    </div>
  )
}
