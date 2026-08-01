export type Category = {
  id: string
  name: string
}

export type Subcategory = {
  id: string
  categoryId: string
  name: string
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
  location: string // поки просто string
  availability: AvailabilityStatus // обов'язкове
  /** Обов'язкове тільки якщо availability === "borrowed". */
  availabilityComment: string
  supplier: string
  serialNumber: string
  warrantyUntil: string | null // дата ISO
  comment: string
  photos: InventoryPhoto[] // одна з них — avatarPhotoId
  avatarPhotoId: string | null
  qrCodeValue: string // згенерований URL типу `${origin}/inventory/${id}`
  archived: boolean
  createdAt: string
  updatedAt: string
}

/** Поля, які задає викликач при створенні (id / qr / timestamps генерує storage). */
export type CreateInventoryItemInput = Omit<
  InventoryItem,
  "id" | "qrCodeValue" | "archived" | "createdAt" | "updatedAt"
>

/** Часткове оновлення; id / createdAt / qrCodeValue не змінюються тут. */
export type UpdateInventoryItemInput = Partial<
  Omit<InventoryItem, "id" | "createdAt" | "qrCodeValue">
>
