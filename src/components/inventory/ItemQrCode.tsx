import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type ItemQrCodeProps = {
  value: string
  itemName: string
  itemId: string
  size?: number
}

function slugifyFileName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "item"
}

function shortId(id: string) {
  if (id.length <= 8) {
    return id
  }
  return `${id.slice(0, 8)}…`
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return [""]
  }

  const lines: string[] = []
  let current = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index]
    const candidate = `${current} ${word}`
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
  }
  lines.push(current)

  // If a single word is still too wide, shrink is handled by the caller via font size.
  return lines
}

function fitWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  fontWeight: string,
  fontFamily: string,
): { fontSize: number; lines: string[] } {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    const lines = wrapCanvasText(context, text, maxWidth)
    const fits = lines.every((line) => context.measureText(line).width <= maxWidth)
    if (fits && lines.length <= 2) {
      return { fontSize, lines }
    }
  }

  context.font = `${fontWeight} ${minFontSize}px ${fontFamily}`
  const lines = wrapCanvasText(context, text, maxWidth).slice(0, 2)
  if (lines.length === 2) {
    // Truncate last line with ellipsis if still overflowing.
    let last = lines[1]
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1)
    }
    lines[1] = context.measureText(last).width <= maxWidth ? last : `${last}…`
  }
  return { fontSize: minFontSize, lines }
}

export function ItemQrCode({ value, itemName, itemId, size = 200 }: ItemQrCodeProps) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)

  const downloadAsPng = async () => {
    const svg = svgRef.current
    if (!svg) {
      return
    }

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const objectUrl = URL.createObjectURL(blob)

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error("Failed to rasterize QR SVG"))
        img.src = objectUrl
      })

      const padding = 16
      const textGap = 10
      const qrSize = size
      const contentWidth = qrSize
      const canvasWidth = contentWidth + padding * 2
      const fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif"

      const measureCanvas = document.createElement("canvas")
      const measureContext = measureCanvas.getContext("2d")
      if (!measureContext) {
        return
      }

      const nameLayout = fitWrappedText(
        measureContext,
        itemName,
        contentWidth,
        16,
        11,
        "700",
        fontFamily,
      )
      const nameLineHeight = Math.round(nameLayout.fontSize * 1.25)
      const idFontSize = 11
      const idLineHeight = Math.round(idFontSize * 1.3)
      const textBlockHeight =
        textGap + nameLayout.lines.length * nameLineHeight + 4 + idLineHeight + padding

      const canvas = document.createElement("canvas")
      canvas.width = canvasWidth
      canvas.height = padding + qrSize + textBlockHeight
      const context = canvas.getContext("2d")
      if (!context) {
        return
      }

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)

      context.drawImage(image, padding, padding, qrSize, qrSize)

      let textY = padding + qrSize + textGap + nameLayout.fontSize
      context.fillStyle = "#111111"
      context.textAlign = "center"
      context.textBaseline = "alphabetic"
      context.font = `700 ${nameLayout.fontSize}px ${fontFamily}`
      for (const line of nameLayout.lines) {
        context.fillText(line, canvasWidth / 2, textY, contentWidth)
        textY += nameLineHeight
      }

      textY += 4
      context.fillStyle = "#6b7280"
      context.font = `400 ${idFontSize}px ${fontFamily}`
      context.fillText(itemId, canvasWidth / 2, textY, contentWidth)

      const pngUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = pngUrl
      link.download = `qr-${slugifyFileName(itemName)}-${itemId.slice(0, 8)}.png`
      link.click()
    } catch (error) {
      console.error("[ItemQrCode] PNG download failed", error)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-2 rounded-md bg-white p-3 text-center">
        <QRCodeSVG ref={svgRef} value={value} size={size} />
        <p className="max-w-[200px] text-sm font-semibold leading-snug text-foreground">
          {itemName}
        </p>
        <p className="max-w-[200px] text-xs text-muted-foreground" title={itemId}>
          {shortId(itemId)}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => void downloadAsPng()}>
        {t("inventory.downloadQr")}
      </Button>
    </div>
  )
}
