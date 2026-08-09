import {
  createCategory,
  createInventoryItem,
  createLocation,
  createSubcategory,
  getCategories,
  getLocations,
  getSubcategories,
} from "@/lib/inventoryStorage"
import type {
  AvailabilityStatus,
  Category,
  CreateInventoryItemInput,
  Location,
  Subcategory,
} from "@/types/inventory"

const SEED_ITEM_COUNT = 20

const seedCategories = [
  { name: "Звук", subcategories: ["Мікрофони", "Колонки", "Мікшери"] },
  { name: "Меблі", subcategories: ["Стільці", "Столи", "Кафедри"] },
  { name: "Техніка", subcategories: ["Проектори", "Ноутбуки", "Камери"] },
  {
    name: "Дитяча кімната",
    subcategories: ["Іграшки", "Книги", "Матеріали для творчості"],
  },
  { name: "Кухня", subcategories: ["Посуд", "Техніка", "Витратні матеріали"] },
]

const seedLocations = [
  "Головний зал",
  "Склад",
  "Кабінет пастора",
  "Дитяча кімната",
  "Кухня",
  "Підвал",
]

const sampleNames = [
  "Мікрофон Shure SM58",
  "Колонка JBL EON615",
  "Мікшерний пульт Yamaha",
  "Стілець складний",
  "Стіл банкетний",
  "Кафедра дерев'яна",
  "Проектор Epson",
  "Ноутбук Dell",
  "Камера Canon",
  "Конструктор LEGO",
  "Біблія дитяча",
  "Фарби акварельні",
  "Каструля 5л",
  "Мікрохвильова піч",
  "Скатертина",
  "Гітара акустична",
  "Барабанна установка",
  "Піаніно цифрове",
  "Прожектор сценічний",
  "Екран проекційний",
]

const suppliers = ["Епіцентр", "Rozetka", "Приватний продавець", ""] as const

const borrowedComments = [
  "Позичено для молодіжного табору",
  "Тимчасово на виїзному служінні",
  "Використовується у філії",
  "Позичено команді прославлення",
]

const itemComments = [
  "Потрібна перевірка кабелів",
  "Новий комплект, у коробці",
  "Зберігати у сухому місці",
  "Перевірено перед сезоном",
  "",
  "",
]

const techCategoryNames = new Set(["Звук", "Техніка"])

type CategorySubcategoryPair = {
  category: Category
  subcategory: Subcategory
}

function pickIndex(length: number, seed: number): number {
  if (length <= 0) {
    return 0
  }
  return Math.abs(seed * 2654435761) % length
}

function pickOne<T>(items: readonly T[], seed: number): T {
  return items[pickIndex(items.length, seed)]!
}

function isTechCategory(categoryName: string): boolean {
  return techCategoryNames.has(categoryName)
}

function ensureSeedTaxonomy(): {
  pairs: CategorySubcategoryPair[]
  locations: Location[]
} {
  let categories = getCategories()
  let subcategories = getSubcategories()
  let locations = getLocations()

  if (categories.length === 0) {
    for (const seed of seedCategories) {
      const category = createCategory(seed.name)
      for (const subcategoryName of seed.subcategories) {
        createSubcategory(category.id, subcategoryName)
      }
    }
    categories = getCategories()
    subcategories = getSubcategories()
  }

  if (locations.length === 0) {
    for (const locationName of seedLocations) {
      createLocation(locationName)
    }
    locations = getLocations()
  }

  const pairs = categories.flatMap((category) =>
    subcategories
      .filter((subcategory) => subcategory.categoryId === category.id)
      .map((subcategory) => ({ category, subcategory })),
  )

  if (pairs.length === 0) {
    throw new Error("No category/subcategory pairs available for seed data")
  }

  if (locations.length === 0) {
    throw new Error("No locations available for seed data")
  }

  return { pairs, locations }
}

function buildSerialNumber(index: number, categoryName: string): string {
  if (!isTechCategory(categoryName)) {
    return ""
  }
  const prefix = categoryName === "Звук" ? "SND" : "TEC"
  return `${prefix}-${String(1000 + index * 17).padStart(6, "0")}`
}

function buildWarrantyUntil(index: number, categoryName: string): string | null {
  // Roughly half of tech items get a future warranty date.
  if (!isTechCategory(categoryName) || index % 2 !== 0) {
    return null
  }
  const date = new Date()
  date.setMonth(date.getMonth() + 6 + (index % 18))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildItemInput(
  index: number,
  pairs: CategorySubcategoryPair[],
  locations: Location[],
): CreateInventoryItemInput {
  const name = sampleNames[index % sampleNames.length]!
  const pair = pickOne(pairs, index + 11)
  const location = pickOne(locations, index + 23)
  const availability: AvailabilityStatus = index % 10 < 7 ? "in_church" : "borrowed"
  const supplier = pickOne(suppliers, index + 5)
  const hasPrice = index % 3 !== 0
  const price = hasPrice ? 50 + pickIndex(4951, index + 41) : null

  return {
    name,
    categoryId: pair.category.id,
    subcategoryId: pair.subcategory.id,
    quantity: 1 + pickIndex(15, index + 3),
    locationId: location.id,
    availability,
    availabilityComment: availability === "borrowed" ? pickOne(borrowedComments, index + 19) : "",
    supplier,
    price,
    serialNumber: buildSerialNumber(index, pair.category.name),
    warrantyUntil: buildWarrantyUntil(index, pair.category.name),
    comment: pickOne(itemComments, index + 29),
    photos: [],
    avatarPhotoId: null,
  }
}

/** Creates 20 varied inventory items (and seed taxonomy if storage is empty). */
function generateSeedData(): void {
  const { pairs, locations } = ensureSeedTaxonomy()

  for (let index = 0; index < SEED_ITEM_COUNT; index += 1) {
    createInventoryItem(buildItemInput(index, pairs, locations))
  }
}

export { generateSeedData, SEED_ITEM_COUNT }
