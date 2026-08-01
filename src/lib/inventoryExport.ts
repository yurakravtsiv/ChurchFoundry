import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

import type { Category, InventoryItem, Location, Subcategory } from "@/types/inventory"

export type InventoryExportRow = {
  Назва: string
  Категорія: string
  Підкатегорія: string
  Кількість: number
  Локація: string
  Наявність: string
  "Коментар наявності": string
  Постачальник: string
  Ціна: number | ""
  Серійник: string
  "Гарантія до": string
  Коментар: string
  Архівовано: string
}

function exportDateStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function prepareExportData(
  items: InventoryItem[],
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
): InventoryExportRow[] {
  return items.map((item) => ({
    Назва: item.name,
    Категорія: categories.find((category) => category.id === item.categoryId)?.name ?? "",
    Підкатегорія:
      subcategories.find((subcategory) => subcategory.id === item.subcategoryId)?.name ?? "",
    Кількість: item.quantity,
    Локація: locations.find((location) => location.id === item.locationId)?.name ?? "",
    Наявність: item.availability === "in_church" ? "В церкві" : "Позичено",
    "Коментар наявності": item.availabilityComment,
    Постачальник: item.supplier,
    Ціна: item.price ?? "",
    Серійник: item.serialNumber,
    "Гарантія до": item.warrantyUntil ?? "",
    Коментар: item.comment,
    Архівовано: item.archived ? "Так" : "Ні",
  }))
}

function autoFitColumns(data: InventoryExportRow[]): XLSX.ColInfo[] {
  const keys = Object.keys(data[0] ?? {}) as Array<keyof InventoryExportRow>
  return keys.map((key) => {
    const headerLength = String(key).length
    const maxCellLength = data.reduce((max, row) => {
      const valueLength = String(row[key] ?? "").length
      return Math.max(max, valueLength)
    }, 0)
    const width = Math.min(Math.max(headerLength, maxCellLength) + 2, 60)
    return { wch: width }
  })
}

export function exportToXlsx(data: InventoryExportRow[]): void {
  const worksheet = XLSX.utils.json_to_sheet(data)
  worksheet["!cols"] = autoFitColumns(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Інвентар")
  XLSX.writeFile(workbook, `inventory-export-${exportDateStamp()}.xlsx`)
}

export async function exportToPdf(data: InventoryExportRow[]): Promise<void> {
  // Font is ~670KB base64 — load only when exporting, not in the main bundle.
  const { robotoFontBase64 } = await import("@/lib/fonts/robotoFont")

  const doc = new jsPDF({ orientation: "landscape" })
  doc.addFileToVFS("Roboto-Regular.ttf", robotoFontBase64)
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
  // autoTable headers default to bold; reuse Regular so Cyrillic stays available.
  doc.addFont("Roboto-Regular.ttf", "Roboto", "bold")
  doc.setFont("Roboto")

  const headers = Object.keys(data[0] ?? {})
  autoTable(doc, {
    head: [headers],
    body: data.map((row) => Object.values(row)),
    styles: { font: "Roboto", fontSize: 7 },
    headStyles: { font: "Roboto", fontStyle: "bold", fillColor: [30, 30, 30] },
  })
  doc.save(`inventory-export-${exportDateStamp()}.pdf`)
}
