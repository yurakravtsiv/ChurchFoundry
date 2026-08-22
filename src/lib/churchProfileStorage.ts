import imageCompression from "browser-image-compression"

import { type ChurchProfile, EMPTY_CHURCH_PROFILE } from "@/types/church"

export const CHURCH_PROFILE_KEY = "churchfoundry:church-profile"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function parseChurchProfile(value: unknown): ChurchProfile {
  if (!isRecord(value)) {
    return { ...EMPTY_CHURCH_PROFILE }
  }

  const logoDataUrl =
    typeof value.logoDataUrl === "string" && value.logoDataUrl.length > 0 ? value.logoDataUrl : null

  return {
    name: typeof value.name === "string" ? value.name : "",
    address: typeof value.address === "string" ? value.address : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    email: typeof value.email === "string" ? value.email : "",
    website: typeof value.website === "string" ? value.website : "",
    logoDataUrl,
  }
}

export function getChurchProfile(): ChurchProfile {
  try {
    const raw = localStorage.getItem(CHURCH_PROFILE_KEY)
    if (!raw) {
      return { ...EMPTY_CHURCH_PROFILE }
    }
    return parseChurchProfile(JSON.parse(raw) as unknown)
  } catch (error) {
    console.error("[churchProfileStorage] Failed to read church profile", error)
    return { ...EMPTY_CHURCH_PROFILE }
  }
}

export function saveChurchProfile(profile: ChurchProfile): ChurchProfile {
  const next: ChurchProfile = {
    name: profile.name.trim(),
    address: profile.address.trim(),
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    website: profile.website.trim(),
    logoDataUrl: profile.logoDataUrl,
  }

  try {
    localStorage.setItem(CHURCH_PROFILE_KEY, JSON.stringify(next))
  } catch (error) {
    console.error("[churchProfileStorage] Failed to write church profile", error)
  }

  return next
}

/**
 * Compresses a church logo for header / QR use. Smaller than inventory photos
 * so a data URL stays reasonable in localStorage.
 */
export async function compressChurchLogo(file: File): Promise<string> {
  const options = {
    maxWidthOrHeight: 256,
    maxSizeMB: 0.15,
    initialQuality: 0.8,
    maxIteration: 4,
    useWebWorker: false,
    fileType: "image/jpeg",
  }

  const compressedFile = await imageCompression(file, options)
  return imageCompression.getDataUrlFromFile(compressedFile)
}

export function churchWebsiteHref(website: string): string {
  const trimmed = website.trim()
  if (!trimmed) {
    return ""
  }
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function isValidChurchWebsite(website: string): boolean {
  const trimmed = website.trim()
  if (!trimmed) {
    return true
  }
  try {
    const url = new URL(churchWebsiteHref(trimmed))
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function churchProfileHasBranding(profile: ChurchProfile | undefined): boolean {
  if (!profile) {
    return false
  }
  return profile.name.trim().length > 0 && Boolean(profile.logoDataUrl)
}
