export type Category = {
  id: string
  name: string
  removed: boolean
}

export type Subcategory = {
  id: string
  categoryId: string
  name: string
  removed: boolean
}

export type Location = {
  id: string
  name: string
  removed: boolean
}

export type AvailabilityStatus = "in_church" | "borrowed"

export type InventoryPhoto = {
  id: string
  dataUrl: string // base64, поки немає реального storage
}

export type InventoryItem = {
  id: string
  name: string // обов'язкове
  categoryId: string // обов'язкове
  subcategoryId: string // обов'язкове
  quantity: number // обов'язкове
  locationId: string // обов'язкове
  availability: AvailabilityStatus // обов'язкове
  /** Обов'язкове тільки якщо availability === "borrowed". */
  availabilityComment: string
  supplier: string
  price: number | null
  serialNumber: string
  warrantyUntil: string | null // дата ISO
  comment: string
  photos: InventoryPhoto[] // одна з них — avatarPhotoId
  avatarPhotoId: string | null
  qrCodeValue: string // згенерований URL типу `${origin}/inventory/${id}`
  archived: boolean
  removed: boolean
  createdAt: string
  updatedAt: string
}

/** Поля, які задає викликач при створенні (id / qr / timestamps генерує storage). */
export type CreateInventoryItemInput = Omit<
  InventoryItem,
  "id" | "qrCodeValue" | "archived" | "removed" | "createdAt" | "updatedAt" | "price"
> & {
  price?: number | null
}

/** Часткове оновлення; id / createdAt / qrCodeValue не змінюються тут. */
export type UpdateInventoryItemInput = Partial<
  Omit<InventoryItem, "id" | "createdAt" | "qrCodeValue">
>
