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

export type Responsible = {
  id: string
  name: string
  removed: boolean
}

export type AvailabilityStatus = "in_church" | "borrowed"

export type ItemCondition = "good" | "needs_repair" | "written_off"

export type InventoryPhoto = {
  id: string
  dataUrl: string // base64, поки немає реального storage
}

export type InventoryItem = {
  id: string
  /** Sequential inventory number, assigned on create (starts at 1). Not used in text search. */
  inventoryNumberId: number
  name: string // обов'язкове
  categoryId: string // обов'язкове
  subcategoryId: string // обов'язкове
  quantity: number // обов'язкове
  locationId: string // обов'язкове
  responsibleId: string // обов'язкове
  availability: AvailabilityStatus // обов'язкове
  /** Обов'язкове тільки якщо availability === "borrowed". */
  availabilityComment: string
  condition: ItemCondition // обов'язкове, за замовчуванням "good" при створенні
  supplier: string
  price: number | null
  serialNumber: string
  warrantyUntil: string | null // дата ISO
  comment: string
  photos: InventoryPhoto[] // одна з них — avatarPhotoId
  avatarPhotoId: string | null
  qrCodeValue: string // згенерований URL типу `${origin}/inventory/${id}`
  archived: boolean
  /** Soft-delete. If true, the entity is never shown anywhere in the app. */
  removed: boolean
  /** ISO date — only set on written-off (split) items. */
  writeOffDate: string | null
  /** Write-off reason — only set on written-off (split) items. */
  writeOffReason: string | null
  /** Original item id this write-off was split from — only on written-off items. */
  originalItemId: string | null
  /** ISO date — only set on needs-repair (split) items created via markAsNeedsRepair. */
  repairDate: string | null
  /** Repair comment — only set on needs-repair (split) items created via markAsNeedsRepair. */
  repairComment: string | null
  /** ISO date — only set on borrowed (split) items created via markAsBorrowed. */
  borrowDate: string | null
  /** Planned return date — only set on borrowed (split) items. Must be after borrowDate. */
  returnDate: string | null
  createdAt: string
  updatedAt: string
}

/** Поля, які задає викликач при створенні (id / number / qr / timestamps / write-off генерує storage). */
export type CreateInventoryItemInput = Omit<
  InventoryItem,
  | "id"
  | "inventoryNumberId"
  | "qrCodeValue"
  | "archived"
  | "removed"
  | "writeOffDate"
  | "writeOffReason"
  | "originalItemId"
  | "repairDate"
  | "repairComment"
  | "borrowDate"
  | "returnDate"
  | "createdAt"
  | "updatedAt"
  | "price"
  | "condition"
> & {
  price?: number | null
}

/** Часткове оновлення; id / inventoryNumberId / createdAt / qrCodeValue не змінюються тут. */
export type UpdateInventoryItemInput = Partial<
  Omit<InventoryItem, "id" | "inventoryNumberId" | "createdAt" | "qrCodeValue">
>
