/** Shared max lengths / numeric bounds for inventory form fields. */
export const INVENTORY_FIELD_LIMITS = {
  name: 120,
  availabilityComment: 200,
  supplier: 120,
  serialNumber: 80,
  comment: 200,
  writeOffReason: 200,
  repairComment: 200,
  entityName: 80, // category / subcategory / location / responsible
  quantityMin: 1,
  quantityMax: 999_999,
  priceMin: 0,
  priceMax: 99_999_999.99,
} as const
