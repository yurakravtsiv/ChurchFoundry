import type { TFunction } from "i18next"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx-js-style"

import { availabilityLabel, conditionLabel } from "@/lib/inventoryLabels"
import type { Category, InventoryItem, Location, Subcategory } from "@/types/inventory"

export type InventoryExportRow = {
  inventoryNumberId: number
  name: string
  category: string
  subcategory: string
  quantity: number
  condition: string
  repairDate: string
  repairComment: string
  writeOffDate?: string
  writeOffReason?: string
  location: string
  availability: string
  availabilityComment: string
  supplier: string
  price: number | ""
  serialNumber: string
  warrantyUntil: string
  comment: string
}

export type InventoryExportOptions = {
  /** When true, includes write-off date/reason columns after condition. */
  includeWriteOffColumns?: boolean
}

/** Stable column order for XLSX/PDF body cells (without write-off extras). */
const BASE_EXPORT_ROW_KEYS = [
  "inventoryNumberId",
  "name",
  "category",
  "subcategory",
  "quantity",
  "condition",
  "repairDate",
  "repairComment",
  "location",
  "availability",
  "availabilityComment",
  "supplier",
  "price",
  "serialNumber",
  "warrantyUntil",
  "comment",
] as const satisfies ReadonlyArray<keyof InventoryExportRow>

type ExportRowKey = (typeof BASE_EXPORT_ROW_KEYS)[number] | "writeOffDate" | "writeOffReason"

function getExportRowKeys(includeWriteOffColumns: boolean): ExportRowKey[] {
  if (!includeWriteOffColumns) {
    return [...BASE_EXPORT_ROW_KEYS]
  }
  const keys: ExportRowKey[] = [...BASE_EXPORT_ROW_KEYS]
  const repairCommentIndex = keys.indexOf("repairComment")
  keys.splice(repairCommentIndex + 1, 0, "writeOffDate", "writeOffReason")
  return keys
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

/** Matches condition Badge colors used in the inventory table. */
const CONDITION_CELL_STYLES = {
  good: {
    fillColor: [209, 250, 229] as [number, number, number], // emerald-100
    textColor: [6, 95, 70] as [number, number, number], // emerald-800
  },
  needs_repair: {
    fillColor: [254, 226, 226] as [number, number, number], // red-100
    textColor: [153, 27, 27] as [number, number, number], // red-800
  },
  written_off: {
    fillColor: [243, 244, 246] as [number, number, number], // gray-100
    textColor: [55, 65, 81] as [number, number, number], // gray-700
  },
} as const

const PDF_PHOTO_COLUMN_INDEX = 0
const PDF_ROW_MIN_HEIGHT_MM = 18
const PDF_PHOTO_SIZE_MM = 12

export function getExportColumnHeaders(t: TFunction): Record<ExportRowKey, string> {
  return {
    inventoryNumberId: t("export.columns.inventoryNumberId"),
    name: t("export.columns.name"),
    category: t("export.columns.category"),
    subcategory: t("export.columns.subcategory"),
    quantity: t("export.columns.quantity"),
    condition: t("export.columns.condition"),
    repairDate: t("export.columns.repairDate"),
    repairComment: t("export.columns.repairComment"),
    writeOffDate: t("export.columns.writeOffDate"),
    writeOffReason: t("export.columns.writeOffReason"),
    location: t("export.columns.location"),
    availability: t("export.columns.availability"),
    availabilityComment: t("export.columns.availabilityComment"),
    supplier: t("export.columns.supplier"),
    price: t("export.columns.price"),
    serialNumber: t("export.columns.serialNumber"),
    warrantyUntil: t("export.columns.warrantyUntil"),
    comment: t("export.columns.comment"),
  }
}

function exportDateStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
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

/**
 * Insert zero-width spaces into long unbroken tokens so jspdf-autotable can
 * wrap them instead of expanding a column to the full string width.
 */
function softBreakLongRuns(value: string | number | null | undefined, maxRunLength = 14): string {
  const text = value == null ? "" : String(value)
  if (!text) {
    return text
  }

  return text.replace(/\S+/g, (token) => {
    if (token.length <= maxRunLength) {
      return token
    }
    const chunks: string[] = []
    for (let index = 0; index < token.length; index += maxRunLength) {
      chunks.push(token.slice(index, index + maxRunLength))
    }
    return chunks.join("\u200b")
  })
}

function formatWriteOffDateForExport(value: string | null): string {
  if (!value) {
    return ""
  }
  return value.slice(0, 10)
}

function localizeExportRows(
  data: InventoryExportRow[],
  t: TFunction,
  includeWriteOffColumns: boolean,
): Record<string, string | number>[] {
  const headers = getExportColumnHeaders(t)
  const keys = getExportRowKeys(includeWriteOffColumns)
  return data.map((row) => {
    const localizedRow: Record<string, string | number> = {}
    for (const key of keys) {
      localizedRow[headers[key]] = row[key] ?? ""
    }
    return localizedRow
  })
}

export function prepareExportData(
  items: InventoryItem[],
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
  t: TFunction,
  options: InventoryExportOptions = {},
): InventoryExportRow[] {
  const includeWriteOffColumns = options.includeWriteOffColumns === true
  return items
    .filter((item) => !item.removed && (includeWriteOffColumns || !item.archived))
    .map((item) => {
      const row: InventoryExportRow = {
        inventoryNumberId: item.inventoryNumberId,
        name: item.name,
        category: categories.find((category) => category.id === item.categoryId)?.name ?? "",
        subcategory:
          subcategories.find((subcategory) => subcategory.id === item.subcategoryId)?.name ?? "",
        quantity: item.quantity,
        condition: conditionLabel(item.condition, t),
        repairDate:
          item.condition === "needs_repair" ? formatWriteOffDateForExport(item.repairDate) : "",
        repairComment: item.condition === "needs_repair" ? (item.repairComment ?? "") : "",
        location: locations.find((location) => location.id === item.locationId)?.name ?? "",
        availability: availabilityLabel(item.availability, t),
        availabilityComment: item.availabilityComment,
        supplier: item.supplier,
        price: item.price ?? "",
        serialNumber: item.serialNumber,
        warrantyUntil: item.warrantyUntil ?? "",
        comment: item.comment,
      }
      if (includeWriteOffColumns) {
        row.writeOffDate = formatWriteOffDateForExport(item.writeOffDate)
        row.writeOffReason = item.writeOffReason ?? ""
      }
      return row
    })
}

function autoFitColumns(data: Record<string, string | number>[]): XLSX.ColInfo[] {
  const keys = Object.keys(data[0] ?? {})
  return keys.map((key) => {
    const headerLength = key.length
    const maxCellLength = data.reduce((max, row) => {
      const valueLength = String(row[key] ?? "").length
      return Math.max(max, valueLength)
    }, 0)
    const width = Math.min(Math.max(headerLength, maxCellLength) + 2, 60)
    return { wch: width }
  })
}

function styleXlsxHeaderRow(worksheet: XLSX.WorkSheet): void {
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1")
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: column })
    const cell = worksheet[address]
    if (!cell) {
      continue
    }
    cell.s = {
      font: {
        bold: true,
        sz: 14,
        name: "Calibri",
      },
      alignment: {
        vertical: "center",
        horizontal: "left",
        wrapText: true,
      },
    }
  }
}

export function exportToXlsx(
  data: InventoryExportRow[],
  t: TFunction,
  options: InventoryExportOptions = {},
): void {
  const includeWriteOffColumns = options.includeWriteOffColumns === true
  const localizedData = localizeExportRows(data, t, includeWriteOffColumns)
  const worksheet = XLSX.utils.json_to_sheet(localizedData)
  worksheet["!cols"] = autoFitColumns(localizedData)
  styleXlsxHeaderRow(worksheet)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, t("export.sheetName"))
  XLSX.writeFile(workbook, `inventory-export-${exportDateStamp()}.xlsx`)
}

export async function exportToPdf(
  items: InventoryItem[],
  categories: Category[],
  subcategories: Subcategory[],
  locations: Location[],
  t: TFunction,
  options: InventoryExportOptions = {},
): Promise<void> {
  const includeWriteOffColumns = options.includeWriteOffColumns === true
  const exportItems = items.filter(
    (item) => !item.removed && (includeWriteOffColumns || !item.archived),
  )
  const rows = prepareExportData(exportItems, categories, subcategories, locations, t, options)
  const headers = getExportColumnHeaders(t)
  const rowKeys = getExportRowKeys(includeWriteOffColumns)
  const conditionColumnIndex = 1 + rowKeys.indexOf("condition")
  const availabilityColumnIndex = 1 + rowKeys.indexOf("availability")
  const availabilityCommentColumnIndex = 1 + rowKeys.indexOf("availabilityComment")
  const commentColumnIndex = 1 + rowKeys.indexOf("comment")

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
    condition: item.condition,
  }))

  const head = [t("export.columns.photo"), ...rowKeys.map((key) => headers[key])]

  const body = rows.map((row) => [
    "",
    ...rowKeys.map((key) => {
      const value = row[key]
      if (typeof value === "number") {
        return value
      }
      return softBreakLongRuns(value)
    }),
  ])

  autoTable(doc, {
    head: [head],
    body,
    styles: {
      font: "Roboto",
      fontSize: 7,
      overflow: "linebreak",
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
      overflow: "linebreak",
    },
    columnStyles: {
      [PDF_PHOTO_COLUMN_INDEX]: { cellWidth: PDF_PHOTO_SIZE_MM + 4, halign: "center" },
      [availabilityCommentColumnIndex]: { cellWidth: 28 },
      [commentColumnIndex]: { cellWidth: 34 },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== "body") {
        return
      }

      if (hookData.column.index === conditionColumnIndex) {
        const condition = rowMeta[hookData.row.index]?.condition
        if (!condition) {
          return
        }
        const style = CONDITION_CELL_STYLES[condition]
        hookData.cell.styles.fillColor = style.fillColor
        hookData.cell.styles.textColor = style.textColor
        hookData.cell.styles.fontStyle = "bold"
        return
      }

      if (hookData.column.index === availabilityColumnIndex) {
        const availability = rowMeta[hookData.row.index]?.availability
        if (!availability) {
          return
        }
        const style = AVAILABILITY_CELL_STYLES[availability]
        hookData.cell.styles.fillColor = style.fillColor
        hookData.cell.styles.textColor = style.textColor
        hookData.cell.styles.fontStyle = "bold"
      }
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
