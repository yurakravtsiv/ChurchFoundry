import { describe, expect, it } from "vitest"

import { getCoverCropRect } from "@/lib/squareRoundedImage"

describe("getCoverCropRect", () => {
  it("returns the full image when it is already square", () => {
    expect(getCoverCropRect(256, 256)).toEqual({ sx: 0, sy: 0, size: 256 })
  })

  it("center-crops a landscape image", () => {
    expect(getCoverCropRect(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 })
  })

  it("center-crops a portrait image", () => {
    expect(getCoverCropRect(200, 400)).toEqual({ sx: 0, sy: 100, size: 200 })
  })
})
