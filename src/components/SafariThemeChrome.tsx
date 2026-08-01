import { useTheme } from "@/hooks/useTheme"
import { themeColorHex } from "@/lib/theme"

/**
 * iOS Safari (esp. 26+) tints the top/bottom browser chrome from nearby
 * position:fixed layers. While a drawer/overlay is open it often freezes that
 * sample until the layer unmounts — so theme toggles look stuck until close.
 *
 * Remounting thin edge strips on every theme change forces a fresh sample.
 */
export function SafariThemeChrome() {
  const { theme } = useTheme()
  const color = themeColorHex(theme)

  return (
    <div key={theme} aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <div
        className="absolute inset-x-0 top-0"
        style={{
          backgroundColor: color,
          height: "max(1px, env(safe-area-inset-top, 0px))",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          backgroundColor: color,
          height: "max(1px, env(safe-area-inset-bottom, 0px))",
        }}
      />
    </div>
  )
}
