import {
  getDefaultColumnPrefs,
  type InventoryColumnPrefs,
  mergeColumnPrefs,
} from "@/lib/inventoryColumnConfig"

export const INVENTORY_COLUMN_PREFS_STORAGE_KEY = "churchfoundry-inventory-column-prefs"

export function loadInventoryColumnPrefs(): InventoryColumnPrefs {
  try {
    const stored = localStorage.getItem(INVENTORY_COLUMN_PREFS_STORAGE_KEY)
    if (!stored) {
      return getDefaultColumnPrefs()
    }
    return mergeColumnPrefs(JSON.parse(stored) as unknown)
  } catch (error) {
    console.error("[inventoryColumnPrefs] Failed to read column prefs", error)
    return getDefaultColumnPrefs()
  }
}

export function saveInventoryColumnPrefs(prefs: InventoryColumnPrefs): void {
  try {
    const normalized = mergeColumnPrefs(prefs)
    localStorage.setItem(INVENTORY_COLUMN_PREFS_STORAGE_KEY, JSON.stringify(normalized))
  } catch (error) {
    console.error("[inventoryColumnPrefs] Failed to save column prefs", error)
  }
}

export function clearInventoryColumnPrefs(): void {
  try {
    localStorage.removeItem(INVENTORY_COLUMN_PREFS_STORAGE_KEY)
  } catch (error) {
    console.error("[inventoryColumnPrefs] Failed to clear column prefs", error)
  }
}
