/** Source crop that fills a square without stretching (object-fit: cover). */
export function getCoverCropRect(
  width: number,
  height: number,
): { sx: number; sy: number; size: number } {
  if (width <= 0 || height <= 0) {
    return { sx: 0, sy: 0, size: 0 }
  }
  if (width >= height) {
    return { sx: (width - height) / 2, sy: 0, size: height }
  }
  return { sx: 0, sy: (height - width) / 2, size: width }
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to load image"))
    image.src = src
  })
}

/**
 * Center-crops a (possibly rectangular) image into a square PNG with rounded corners.
 * Used in QR codes, where CSS object-fit / border-radius cannot clip the embedded image.
 */
export async function toSquareRoundedPng(
  src: string,
  outputSize: number,
  cornerRadius: number,
): Promise<string> {
  const image = await loadImage(src)
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  const crop = getCoverCropRect(sourceWidth, sourceHeight)

  const canvas = document.createElement("canvas")
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas 2D context is not available")
  }

  context.clearRect(0, 0, outputSize, outputSize)
  roundedRectPath(context, 0, 0, outputSize, outputSize, cornerRadius)
  context.clip()
  context.drawImage(image, crop.sx, crop.sy, crop.size, crop.size, 0, 0, outputSize, outputSize)
  return canvas.toDataURL("image/png")
}
