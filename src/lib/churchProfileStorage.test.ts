import { afterEach, describe, expect, it } from "vitest"

import {
  CHURCH_PROFILE_KEY,
  churchProfileHasBranding,
  churchWebsiteHref,
  getChurchProfile,
  isValidChurchWebsite,
  parseChurchProfile,
  saveChurchProfile,
} from "@/lib/churchProfileStorage"
import { EMPTY_CHURCH_PROFILE } from "@/types/church"

describe("churchProfileStorage", () => {
  afterEach(() => {
    localStorage.removeItem(CHURCH_PROFILE_KEY)
  })

  it("returns an empty profile when nothing is stored", () => {
    expect(getChurchProfile()).toEqual(EMPTY_CHURCH_PROFILE)
  })

  it("saves trimmed fields and reads them back", () => {
    const saved = saveChurchProfile({
      name: "  Life Church  ",
      address: "  Kyiv  ",
      phone: "  +380 00 000 00 00  ",
      email: "  hello@example.com  ",
      website: "  church.example  ",
      logoDataUrl: "data:image/jpeg;base64,abc",
    })

    expect(saved).toEqual({
      name: "Life Church",
      address: "Kyiv",
      phone: "+380 00 000 00 00",
      email: "hello@example.com",
      website: "church.example",
      logoDataUrl: "data:image/jpeg;base64,abc",
    })
    expect(getChurchProfile()).toEqual(saved)
  })

  it("parses invalid JSON shapes as an empty profile", () => {
    expect(parseChurchProfile(null)).toEqual(EMPTY_CHURCH_PROFILE)
    expect(parseChurchProfile("nope")).toEqual(EMPTY_CHURCH_PROFILE)
    expect(parseChurchProfile({ name: 1, logoDataUrl: "" })).toEqual({
      ...EMPTY_CHURCH_PROFILE,
    })
  })

  it("treats branding as set only when both name and logo exist", () => {
    expect(churchProfileHasBranding(undefined)).toBe(false)
    expect(
      churchProfileHasBranding({
        ...EMPTY_CHURCH_PROFILE,
        name: "Life",
      }),
    ).toBe(false)
    expect(
      churchProfileHasBranding({
        ...EMPTY_CHURCH_PROFILE,
        logoDataUrl: "data:image/jpeg;base64,abc",
      }),
    ).toBe(false)
    expect(
      churchProfileHasBranding({
        ...EMPTY_CHURCH_PROFILE,
        name: "Life",
        logoDataUrl: "data:image/jpeg;base64,abc",
      }),
    ).toBe(true)
  })

  it("accepts empty or http(s) websites and prefixes https when needed", () => {
    expect(isValidChurchWebsite("")).toBe(true)
    expect(isValidChurchWebsite("church.example")).toBe(true)
    expect(isValidChurchWebsite("https://church.example")).toBe(true)
    expect(isValidChurchWebsite("javascript:alert(1)")).toBe(false)
    expect(churchWebsiteHref("church.example")).toBe("https://church.example")
    expect(churchWebsiteHref("https://church.example")).toBe("https://church.example")
  })
})
