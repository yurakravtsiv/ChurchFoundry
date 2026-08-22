import { describe, expect, it } from "vitest"

import {
  extractHouseNumber,
  formatNominatimAddress,
  mapsSearchUrl,
  nominatimLanguage,
  parseNominatimResults,
  withTypedAddressFallback,
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

  it("extracts a Ukrainian house number from a typed query", () => {
    expect(extractHouseNumber("Україна, Львів, Медової Печери, 41а")).toBe("41а")
    expect(extractHouseNumber("Львів Медової Печери 41-а")).toBe("41-а")
    expect(extractHouseNumber("Kyiv Khreshchatyk 19-А")).toBe("19-А")
    expect(extractHouseNumber("вулиця Хрещатик")).toBeUndefined()
    expect(extractHouseNumber("79038 Львів")).toBeUndefined()
  })

  it("adds a missing house number to a street-level Nominatim result", () => {
    expect(
      formatNominatimAddress(
        {
          addresstype: "road",
          name: "вулиця Медової Печери",
          address: {
            road: "вулиця Медової Печери",
            postcode: "79038",
            city: "Львів",
            country: "Україна",
          },
        },
        "41а",
      ),
    ).toBe("вулиця Медової Печери 41а, 79038, Львів, Україна")
  })

  it("does not attach a house number to a city-level result", () => {
    expect(
      formatNominatimAddress(
        {
          addresstype: "city",
          name: "Львів",
          address: { city: "Львів", country: "Україна" },
        },
        "41а",
      ),
    ).toBe("Львів, Україна")
  })

  it("keeps the typed query as a selectable suggestion", () => {
    expect(
      withTypedAddressFallback("Львів, Медової Печери, 41а", [
        { id: "1", label: "вулиця Медової Печери 41а, Львів, Україна" },
      ]),
    ).toEqual([
      { id: "typed:Львів, Медової Печери, 41а", label: "Львів, Медової Печери, 41а" },
      { id: "1", label: "вулиця Медової Печери 41а, Львів, Україна" },
    ])
  })

  it("builds a Google Maps search url", () => {
    expect(mapsSearchUrl("Львів, Медової Печери, 41а")).toBe(
      "https://www.google.com/maps/search/?api=1&query=%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%2C%20%D0%9C%D0%B5%D0%B4%D0%BE%D0%B2%D0%BE%D1%97%20%D0%9F%D0%B5%D1%87%D0%B5%D1%80%D0%B8%2C%2041%D0%B0",
    )
  })
})
