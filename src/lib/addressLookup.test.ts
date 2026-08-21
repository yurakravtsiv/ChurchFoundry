import { describe, expect, it } from "vitest"

import { formatPhotonAddress, parsePhotonFeatures } from "@/lib/addressLookup"

describe("addressLookup", () => {
  it("formats a street address from Photon properties", () => {
    expect(
      formatPhotonAddress({
        street: "Khreshchatyk",
        housenumber: "1",
        postcode: "01001",
        city: "Kyiv",
        country: "Ukraine",
      }),
    ).toBe("Khreshchatyk 1, 01001, Kyiv, Ukraine")
  })

  it("includes a place name when it differs from the street", () => {
    expect(
      formatPhotonAddress({
        name: "St. Michael's Cathedral",
        street: "Mykhailivska Square",
        city: "Kyiv",
        country: "Ukraine",
      }),
    ).toBe("St. Michael's Cathedral, Mykhailivska Square, Kyiv, Ukraine")
  })

  it("parses Photon features and skips duplicates", () => {
    const suggestions = parsePhotonFeatures({
      features: [
        {
          properties: { osm_id: 1, name: "Kyiv", country: "Ukraine" },
        },
        {
          properties: { osm_id: 2, name: "Kyiv", country: "Ukraine" },
        },
        {
          properties: { osm_id: 3, name: "Lviv", country: "Ukraine" },
        },
      ],
    })

    expect(suggestions).toEqual([
      { id: "1", label: "Kyiv, Ukraine" },
      { id: "3", label: "Lviv, Ukraine" },
    ])
  })

  it("returns an empty list for invalid payloads", () => {
    expect(parsePhotonFeatures(null)).toEqual([])
    expect(parsePhotonFeatures({})).toEqual([])
  })
})
