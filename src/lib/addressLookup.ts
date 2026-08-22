export type AddressSuggestion = {
  id: string
  label: string
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
const STREET_ADDRESS_TYPES = new Set(["road", "pedestrian", "path", "street"])
const HOUSE_NUMBER_IN_QUERY =
  /(?:^|[\s,.;])(\d{1,4}(?:[/-]\d{1,3})?(?:-?[а-яА-ЯіїєґІЇЄҐa-zA-Z])?)(?=$|[\s,.;])/giu

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function uniqueParts(parts: Array<string | undefined>): string[] {
  const unique: string[] = []
  for (const part of parts) {
    const trimmed = part?.trim()
    if (!trimmed) {
      continue
    }
    if (trimmed === unique[unique.length - 1]) {
      continue
    }
    unique.push(trimmed)
  }
  return unique
}

function isStreetLevel(item: Record<string, unknown>, road: string): boolean {
  const addressType = readString(item.addresstype)
  if (addressType) {
    return STREET_ADDRESS_TYPES.has(addressType)
  }
  return Boolean(road)
}

export function nominatimLanguage(lang: string): "uk" | "en" {
  return lang.toLowerCase().startsWith("uk") ? "uk" : "en"
}

export function extractHouseNumber(query: string): string | undefined {
  const matches = [...query.matchAll(HOUSE_NUMBER_IN_QUERY)]
  return matches.at(-1)?.[1]
}

export function formatNominatimAddress(
  item: Record<string, unknown>,
  houseNumberFromQuery?: string,
): string {
  const address = isRecord(item.address) ? item.address : {}
  const road =
    readString(address.road) || readString(address.pedestrian) || readString(address.street)
  const osmHouse = readString(address.house_number)
  const house =
    osmHouse || (houseNumberFromQuery && isStreetLevel(item, road) ? houseNumberFromQuery : "")
  const streetLine = uniqueParts([road, house]).join(" ")
  const name = readString(item.name)
  const city =
    readString(address.city) ||
    readString(address.town) ||
    readString(address.village) ||
    readString(address.municipality)

  const includeName = Boolean(name && streetLine && name !== road && name !== city)

  const formatted = uniqueParts([
    includeName ? name : undefined,
    streetLine || name,
    readString(address.postcode),
    city,
    readString(address.state),
    readString(address.country),
  ]).join(", ")

  return formatted || readString(item.display_name)
}

export function parseNominatimResults(
  data: unknown,
  houseNumberFromQuery?: string,
): AddressSuggestion[] {
  if (!Array.isArray(data)) {
    return []
  }

  const suggestions: AddressSuggestion[] = []
  const seenLabels = new Set<string>()

  for (const item of data) {
    if (!isRecord(item)) {
      continue
    }
    const label = formatNominatimAddress(item, houseNumberFromQuery)
    if (!label || seenLabels.has(label)) {
      continue
    }
    seenLabels.add(label)

    const placeId = item.place_id
    const id =
      typeof placeId === "number" || typeof placeId === "string"
        ? String(placeId)
        : `${suggestions.length}-${label}`
    suggestions.push({ id, label })
  }

  return suggestions
}

export function withTypedAddressFallback(
  query: string,
  suggestions: AddressSuggestion[],
): AddressSuggestion[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return suggestions
  }

  const alreadyListed = suggestions.some(
    (suggestion) =>
      suggestion.label.localeCompare(trimmed, undefined, { sensitivity: "accent" }) === 0,
  )
  if (alreadyListed) {
    return suggestions
  }

  return [{ id: `typed:${trimmed}`, label: trimmed }, ...suggestions]
}

export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export async function searchAddresses(
  query: string,
  lang: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) {
    return []
  }

  const language = nominatimLanguage(lang)
  const houseNumberFromQuery = extractHouseNumber(trimmed)
  const params = new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    "accept-language": language,
  })

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": language,
    },
  })
  if (!response.ok) {
    throw new Error("Address search failed")
  }

  return withTypedAddressFallback(
    trimmed,
    parseNominatimResults(await response.json(), houseNumberFromQuery),
  )
}
