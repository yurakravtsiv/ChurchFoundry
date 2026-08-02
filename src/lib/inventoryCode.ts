/**
 * Temporary church slug until the church name is stored in the database.
 * Used in the public inventory label under the QR code.
 */
export const HARDCODED_CHURCH_CODE = "LIFE"

const INVENTORY_CODE_SEGMENT = "CHURCH-INV"
const PADDED_NUMBER_MAX = 999_999
const PADDED_NUMBER_WIDTH = 6

/** Formats e.g. LIFE-CHURCH-INV-000001 (padding up to 6 digits; then 1000000+ as-is). */
export function formatInventoryPublicCode(inventoryNumberId: number): string {
  const numberPart =
    inventoryNumberId > PADDED_NUMBER_MAX
      ? String(inventoryNumberId)
      : String(inventoryNumberId).padStart(PADDED_NUMBER_WIDTH, "0")
  return `${HARDCODED_CHURCH_CODE}-${INVENTORY_CODE_SEGMENT}-${numberPart}`
}
