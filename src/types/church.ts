export type ChurchProfile = {
  name: string
  address: string
  phone: string
  email: string
  website: string
  logoDataUrl: string | null
}

export const EMPTY_CHURCH_PROFILE: ChurchProfile = {
  name: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logoDataUrl: null,
}

export const CHURCH_PROFILE_FIELD_LIMITS = {
  name: 120,
  address: 200,
  phone: 40,
  email: 120,
  website: 200,
} as const
