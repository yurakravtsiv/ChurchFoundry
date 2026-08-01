import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type ItemQrCodeProps = {
  value: string
  size?: number
}

export function ItemQrCode({ value, size = 200 }: ItemQrCodeProps) {
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

      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext("2d")
      if (!context) {
        return
      }

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, size, size)
      context.drawImage(image, 0, 0, size, size)

      const pngUrl = canvas.toDataURL("image/png")
      const segment = value.split("/").filter(Boolean).at(-1) ?? "item"
      const link = document.createElement("a")
      link.href = pngUrl
      link.download = `qr-${segment}.png`
      link.click()
    } catch (error) {
      console.error("[ItemQrCode] PNG download failed", error)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeSVG ref={svgRef} value={value} size={size} />
      <Button type="button" variant="outline" size="sm" onClick={() => void downloadAsPng()}>
        {t("inventory.downloadQr")}
      </Button>
    </div>
  )
}
