export type AddressSuggestion = {
  id: string
  label: string
}

const PHOTON_URL = "https://photon.komoot.io/api/"

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

export function formatPhotonAddress(properties: Record<string, unknown>): string {
  const street = readString(properties.street)
  const housenumber = readString(properties.housenumber)
  const streetLine = uniqueParts([street, housenumber]).join(" ")
  const name = readString(properties.name)
  const city =
    readString(properties.city) ||
    readString(properties.locality) ||
    readString(properties.district) ||
    readString(properties.town)

  const primary = streetLine || name
  const includeName = Boolean(name && streetLine && name !== street && name !== city)

  return uniqueParts([
    includeName ? name : undefined,
    primary,
    readString(properties.postcode),
    city,
    readString(properties.state),
    readString(properties.country),
  ]).join(", ")
}

export function parsePhotonFeatures(data: unknown): AddressSuggestion[] {
  if (!isRecord(data) || !Array.isArray(data.features)) {
    return []
  }

  const suggestions: AddressSuggestion[] = []
  const seenLabels = new Set<string>()

  for (const feature of data.features) {
    if (!isRecord(feature)) {
      continue
    }
    const properties = isRecord(feature.properties) ? feature.properties : {}
    const label = formatPhotonAddress(properties)
    if (!label || seenLabels.has(label)) {
      continue
    }
    seenLabels.add(label)

    const osmId = properties.osm_id
    const id =
      typeof osmId === "number" || typeof osmId === "string"
        ? String(osmId)
        : `${suggestions.length}-${label}`
    suggestions.push({ id, label })
  }

  return suggestions
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

  const params = new URLSearchParams({
    q: trimmed,
    limit: "6",
  })
  if (lang === "en") {
    params.set("lang", "en")
  }

  const response = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal })
  if (!response.ok) {
    throw new Error("Address search failed")
  }

  return parsePhotonFeatures(await response.json())
}
