import { ArrowDown, Loader2 } from "lucide-react"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const PULL_THRESHOLD_PX = 80
const MAX_PULL_PX = 120
const INDICATOR_MAX_PX = 56

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
  const pullingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const runRefresh = useCallback(async () => {
    setRefreshing(true)
    setPullDistance(INDICATOR_MAX_PX)
    try {
      await onRefresh()
    } finally {
      // If onRefresh did not reload the page, hide the indicator.
      setRefreshing(false)
      setPullDistance(0)
      pullDistanceRef.current = 0
    }
  }, [onRefresh])

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
      startYRef.current = event.touches[0]?.clientY ?? 0
      pullingRef.current = true
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshing) {
        return
      }

      // Mid-page scroll must stay native — abort pull gesture.
      if (el.scrollTop > 0) {
        pullingRef.current = false
        if (pullDistanceRef.current !== 0) {
          pullDistanceRef.current = 0
          setPullDistance(0)
        }
        return
      }

      const currentY = event.touches[0]?.clientY ?? 0
      const delta = currentY - startYRef.current
      if (delta <= 0) {
        if (pullDistanceRef.current !== 0) {
          pullDistanceRef.current = 0
          setPullDistance(0)
        }
        return
      }

      // Resist overscroll past the max pull distance.
      const next = Math.min(delta * 0.55, MAX_PULL_PX)
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

      pullDistanceRef.current = 0
      setPullDistance(0)
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
  }, [refreshing, runRefresh])

  const indicatorHeight = refreshing ? INDICATOR_MAX_PX : Math.min(pullDistance, INDICATOR_MAX_PX)
  const readyToRefresh = pullDistance >= PULL_THRESHOLD_PX
  const showIndicator = indicatorHeight > 4 || refreshing

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-w-0 flex-1 overflow-y-auto overscroll-y-contain pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
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
            "mt-2 flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-transform duration-200",
            readyToRefresh && !refreshing && "scale-110",
          )}
          role="status"
          aria-live="polite"
          aria-label={refreshing ? t("refresh.refreshing") : t("refresh.pull")}
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                "size-4 transition-transform duration-200",
                readyToRefresh && "rotate-180",
              )}
            />
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
