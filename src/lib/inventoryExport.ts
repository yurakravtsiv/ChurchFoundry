import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

import type {
  AvailabilityStatus,
  Category,
  InventoryItem,
  Location,
  Subcategory,
} from "@/types/inventory"

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
}

/** Matches Badge success / warning (light theme) used in the inventory table. */
const AVAILABILITY_CELL_STYLES = {
  in_church: {
    fillColor: [209, 250, 229] as [number, number, number], // emerald-100
    textColor: [6, 95, 70] as [number, number, number], // emerald-800
  },
  borrowed: {
    fillColor: [254, 243, 199] as [number, number, number], // amber-100
    textColor: [120, 53, 15] as [number, number, number], // amber-900
  },
} as const

const PDF_HEADERS = [
  "Фото",
  "Назва",
  "Категорія",
  "Підкатегорія",
  "Кількість",
  "Локація",
  "Наявність",
  "Коментар наявності",
  "Постачальник",
  "Ціна",
  "Серійник",
  "Гарантія до",
  "Коментар",
] as const

const PDF_AVAILABILITY_COLUMN_INDEX = PDF_HEADERS.indexOf("Наявність")
const PDF_PHOTO_COLUMN_INDEX = 0
const PDF_ROW_MIN_HEIGHT_MM = 18
const PDF_PHOTO_SIZE_MM = 12

function exportDateStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function availabilityLabel(availability: AvailabilityStatus) {
  return availability === "in_church" ? "В церкві" : "Позичено"
}

function getAvatarDataUrl(item: InventoryItem): string | null {
  if (!item.avatarPhotoId) {
    return null
  }
  return item.photos.find((photo) => photo.id === item.avatarPhotoId)?.dataUrl ?? null
}

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.startsWith("data:image/png")) {
    return "PNG"
  }
  return "JPEG"
}

export function prepareExportData(
  items: InventoryItem[],
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
): InventoryExportRow[] {
  return items
    .filter((item) => !item.removed && !item.archived)
    .map((item) => ({
      Назва: item.name,
      Категорія: categories.find((category) => category.id === item.categoryId)?.name ?? "",
      Підкатегорія:
        subcategories.find((subcategory) => subcategory.id === item.subcategoryId)?.name ?? "",
      Кількість: item.quantity,
      Локація: locations.find((location) => location.id === item.locationId)?.name ?? "",
      Наявність: availabilityLabel(item.availability),
      "Коментар наявності": item.availabilityComment,
      Постачальник: item.supplier,
      Ціна: item.price ?? "",
      Серійник: item.serialNumber,
      "Гарантія до": item.warrantyUntil ?? "",
      Коментар: item.comment,
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

export async function exportToPdf(
  items: InventoryItem[],
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
): Promise<void> {
  const exportItems = items.filter((item) => !item.removed && !item.archived)
  // Font is ~670KB base64 — load only when exporting, not in the main bundle.
  const { robotoFontBase64 } = await import("@/lib/fonts/robotoFont")

  const doc = new jsPDF({ orientation: "landscape" })
  doc.addFileToVFS("Roboto-Regular.ttf", robotoFontBase64)
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
  // autoTable headers default to bold; reuse Regular so Cyrillic stays available.
  doc.addFont("Roboto-Regular.ttf", "Roboto", "bold")
  doc.setFont("Roboto")

  const rowMeta = exportItems.map((item) => ({
    avatarDataUrl: getAvatarDataUrl(item),
    availability: item.availability,
  }))

  const body = exportItems.map((item) => [
    "",
    item.name,
    categories.find((category) => category.id === item.categoryId)?.name ?? "",
    subcategories.find((subcategory) => subcategory.id === item.subcategoryId)?.name ?? "",
    item.quantity,
    locations.find((location) => location.id === item.locationId)?.name ?? "",
    availabilityLabel(item.availability),
    item.availabilityComment,
    item.supplier,
    item.price ?? "",
    item.serialNumber,
    item.warrantyUntil ?? "",
    item.comment,
  ])

  autoTable(doc, {
    head: [[...PDF_HEADERS]],
    body,
    styles: {
      font: "Roboto",
      fontSize: 7,
      minCellHeight: PDF_ROW_MIN_HEIGHT_MM,
      valign: "middle",
      cellPadding: { top: 2.5, right: 1.5, bottom: 2.5, left: 1.5 },
    },
    headStyles: {
      font: "Roboto",
      fontStyle: "bold",
      fillColor: [30, 30, 30],
      minCellHeight: 10,
      valign: "middle",
    },
    columnStyles: {
      [PDF_PHOTO_COLUMN_INDEX]: { cellWidth: PDF_PHOTO_SIZE_MM + 4, halign: "center" },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== "body" || hookData.column.index !== PDF_AVAILABILITY_COLUMN_INDEX) {
        return
      }
      const availability = rowMeta[hookData.row.index]?.availability
      if (!availability) {
        return
      }
      const style = AVAILABILITY_CELL_STYLES[availability]
      hookData.cell.styles.fillColor = style.fillColor
      hookData.cell.styles.textColor = style.textColor
      hookData.cell.styles.fontStyle = "bold"
    },
    didDrawCell: (hookData) => {
      if (hookData.section !== "body" || hookData.column.index !== PDF_PHOTO_COLUMN_INDEX) {
        return
      }
      const source = rowMeta[hookData.row.index]?.avatarDataUrl
      if (!source) {
        return
      }

      const size = Math.min(PDF_PHOTO_SIZE_MM, hookData.cell.width - 2, hookData.cell.height - 2)
      const x = hookData.cell.x + (hookData.cell.width - size) / 2
      const y = hookData.cell.y + (hookData.cell.height - size) / 2

      try {
        doc.addImage(source, imageFormatFromDataUrl(source), x, y, size, size)
      } catch (error) {
        console.error("[inventoryExport] Failed to draw PDF row image", error)
      }
    },
  })

  doc.save(`inventory-export-${exportDateStamp()}.pdf`)
}
