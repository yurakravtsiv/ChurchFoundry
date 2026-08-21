import { describe, expect, it } from "vitest"

import {
  formatNominatimAddress,
  nominatimLanguage,
  parseNominatimResults,
} from "@/lib/addressLookup"

describe("addressLookup", () => {
  it("maps app language to Nominatim accept-language", () => {
    expect(nominatimLanguage("uk")).toBe("uk")
    expect(nominatimLanguage("uk-UA")).toBe("uk")
    expect(nominatimLanguage("en")).toBe("en")
  })

  it("formats a Ukrainian street address from Nominatim fields", () => {
    expect(
      formatNominatimAddress({
        name: "Хрещатик",
        address: {
          house_number: "19-А",
          road: "вулиця Хрещатик",
          postcode: "01001",
          city: "Київ",
          country: "Україна",
        },
      }),
    ).toBe("Хрещатик, вулиця Хрещатик 19-А, 01001, Київ, Україна")
  })

  it("includes a place name when it differs from the street", () => {
    expect(
      formatNominatimAddress({
        name: "Собор Святого Михайла",
        address: {
          road: "Михайлівська площа",
          city: "Київ",
          country: "Україна",
        },
      }),
    ).toBe("Собор Святого Михайла, Михайлівська площа, Київ, Україна")
  })

  it("falls back to display_name when structured fields are missing", () => {
    expect(
      formatNominatimAddress({
        display_name: "Київ, Україна",
      }),
    ).toBe("Київ, Україна")
  })

  it("parses Nominatim results and skips duplicates", () => {
    const suggestions = parseNominatimResults([
      { place_id: 1, name: "Київ", address: { city: "Київ", country: "Україна" } },
      { place_id: 2, name: "Київ", address: { city: "Київ", country: "Україна" } },
      { place_id: 3, name: "Львів", address: { city: "Львів", country: "Україна" } },
    ])

    expect(suggestions).toEqual([
      { id: "1", label: "Київ, Україна" },
      { id: "3", label: "Львів, Україна" },
    ])
  })

  it("returns an empty list for invalid payloads", () => {
    expect(parseNominatimResults(null)).toEqual([])
    expect(parseNominatimResults({})).toEqual([])
  })
})
