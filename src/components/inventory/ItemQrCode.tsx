import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { formatInventoryPublicCode } from "@/lib/inventoryCode"

type ItemQrCodeProps = {
  value: string
  itemName: string
  inventoryNumberId: number
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

/** Wrap by words; break long unbroken tokens by character to fit maxWidth. */
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
  let current = ""

  const flushCharacterWrapped = (token: string) => {
    let piece = ""
    for (const char of token) {
      const nextPiece = `${piece}${char}`
      if (piece && context.measureText(nextPiece).width > maxWidth) {
        lines.push(piece)
        piece = char
      } else {
        piece = nextPiece
      }
    }
    current = piece
  }

  for (const word of words) {
    const joined = current ? `${current} ${word}` : word
    if (!current || context.measureText(joined).width <= maxWidth) {
      current = joined
      continue
    }

    lines.push(current)
    current = ""

    if (context.measureText(word).width <= maxWidth) {
      current = word
      continue
    }

    flushCharacterWrapped(word)
  }

  if (current) {
    lines.push(current)
  }

  return lines.length > 0 ? lines : [""]
}

function fitWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  fontWeight: string,
  fontFamily: string,
  maxLines = 2,
): { fontSize: number; lines: string[] } {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    const lines = wrapCanvasText(context, text, maxWidth)
    const fits = lines.every((line) => context.measureText(line).width <= maxWidth)
    if (fits && lines.length <= maxLines) {
      return { fontSize, lines }
    }
  }

  context.font = `${fontWeight} ${minFontSize}px ${fontFamily}`
  const lines = wrapCanvasText(context, text, maxWidth).slice(0, maxLines)
  if (lines.length === maxLines && maxLines > 0) {
    let last = lines[maxLines - 1]
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1)
    }
    lines[maxLines - 1] = context.measureText(last).width <= maxWidth ? last : `${last}…`
  }
  return { fontSize: minFontSize, lines }
}

export function ItemQrCode({ value, itemName, inventoryNumberId, size = 200 }: ItemQrCodeProps) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const publicCode = formatInventoryPublicCode(inventoryNumberId)

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
        3,
      )
      const codeLayout = fitWrappedText(
        measureContext,
        publicCode,
        contentWidth,
        11,
        9,
        "400",
        fontFamily,
        3,
      )
      const nameLineHeight = Math.round(nameLayout.fontSize * 1.25)
      const codeLineHeight = Math.round(codeLayout.fontSize * 1.3)
      const textBlockHeight =
        textGap +
        nameLayout.lines.length * nameLineHeight +
        4 +
        codeLayout.lines.length * codeLineHeight +
        padding

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
      context.font = `400 ${codeLayout.fontSize}px ${fontFamily}`
      for (const line of codeLayout.lines) {
        context.fillText(line, canvasWidth / 2, textY, contentWidth)
        textY += codeLineHeight
      }

      const pngUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = pngUrl
      link.download = `qr-${slugifyFileName(itemName)}-${publicCode}.png`
      link.click()
    } catch (error) {
      console.error("[ItemQrCode] PNG download failed", error)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-3">
      <div className="mx-auto flex w-full min-w-0 max-w-[min(100%,13.875rem)] flex-col items-center gap-2 rounded-md bg-white p-3 text-center">
        <QRCodeSVG
          ref={svgRef}
          value={value}
          size={size}
          className="max-w-full"
          style={{ width: "100%", height: "auto" }}
        />
        <p className="w-full max-w-full break-words text-sm font-semibold leading-snug text-foreground">
          {itemName}
        </p>
        <p className="w-full max-w-full break-all text-xs leading-snug text-muted-foreground">
          {publicCode}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto max-w-full whitespace-normal px-3 py-2 text-center"
        onClick={() => void downloadAsPng()}
      >
        {t("inventory.downloadQr")}
      </Button>
    </div>
  )
}
