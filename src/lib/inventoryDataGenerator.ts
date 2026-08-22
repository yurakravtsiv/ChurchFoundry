import {
  createCategory,
  createInventoryItem,
  createLocation,
  createResponsible,
  createSubcategory,
  getCategories,
  getInventoryItemById,
  getLocations,
  getResponsibles,
  getSubcategories,
  markAsBorrowed,
  markAsNeedsRepair,
  updateInventoryItem,
  writeOffItem,
} from "@/lib/inventoryStorage"
import type {
  Category,
  CreateInventoryItemInput,
  InventoryItem,
  Location,
  Responsible,
  Subcategory,
  UpdateInventoryItemInput,
} from "@/types/inventory"

const SEED_ITEM_COUNT = 20
/** Disjoint from repair/borrow picks; the whole quantity is written off. */
const WRITE_OFF_BATCH_COUNT = 3
/** Disjoint from write-off/borrow picks; the whole quantity is marked for repair. */
const REPAIR_BATCH_COUNT = 3
/** Disjoint from write-off/repair picks; the whole quantity is borrowed. */
const BORROW_BATCH_COUNT = 3
/** Share of created items that get a follow-up edit (excluding write-off/repair picks). */
const SEED_UPDATE_RATIO = 0.3

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

const seedResponsibles = [
  "Команда звуку",
  "Адміністрація",
  "Молодіжне служіння",
  "Дитяче служіння",
  "Команда кухні",
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

const seedUpdateComments = [
  "Уточнено кількість після інвентаризації",
  "Додано примітку після перевірки",
  "Оновлено після переміщення на склад",
  "Скориговано за результатами огляду",
] as const

const writeOffReasons = [
  "Зношення, не підлягає відновленню",
  "Втрачено на виїзному заході",
  "Пошкоджено під час транспортування",
  "Морально застаріло",
  "Невідповідність технічним вимогам",
] as const

const repairComments = [
  "Не працює живлення",
  "Тріщина на корпусі",
  "Потребує заміни батареї",
  "Скрипить/заїдає механізм",
  "Пошкоджений кабель",
] as const

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

function shuffledIndices(count: number, seed: number): number[] {
  const indices = Array.from({ length: count }, (_, index) => index)
  for (let index = count - 1; index > 0; index -= 1) {
    const swapIndex = pickIndex(index + 1, seed + index)
    const current = indices[index]!
    indices[index] = indices[swapIndex]!
    indices[swapIndex] = current
  }
  return indices
}

function buildRecentIsoDate(seed: number, minDaysAgo: number, maxDaysAgo: number): string {
  const span = Math.max(maxDaysAgo - minDaysAgo, 0)
  const daysAgo = minDaysAgo + pickIndex(span + 1, seed)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isCleanActiveItem(item: InventoryItem): boolean {
  return (
    item.condition === "good" &&
    item.availability === "in_church" &&
    item.quantity > 0 &&
    item.removed !== true &&
    item.archived !== true
  )
}

function isTechCategory(categoryName: string): boolean {
  return techCategoryNames.has(categoryName)
}

function ensureSeedTaxonomy(): {
  pairs: CategorySubcategoryPair[]
  locations: Location[]
  responsibles: Responsible[]
} {
  let categories = getCategories()
  let subcategories = getSubcategories()
  let locations = getLocations()
  let responsibles = getResponsibles()

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

  if (responsibles.length === 0) {
    for (const responsibleName of seedResponsibles) {
      createResponsible(responsibleName)
    }
    responsibles = getResponsibles()
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

  if (responsibles.length === 0) {
    throw new Error("No responsibles available for seed data")
  }

  return { pairs, locations, responsibles }
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
  responsibles: Responsible[],
): CreateInventoryItemInput {
  const name = sampleNames[index % sampleNames.length]!
  const pair = pickOne(pairs, index + 11)
  const location = pickOne(locations, index + 23)
  const responsible = pickOne(responsibles, index + 31)
  const supplier = pickOne(suppliers, index + 5)
  const hasPrice = index % 3 !== 0
  const price = hasPrice ? 50 + pickIndex(4951, index + 41) : null

  return {
    name,
    categoryId: pair.category.id,
    subcategoryId: pair.subcategory.id,
    quantity: 1 + pickIndex(15, index + 3),
    locationId: location.id,
    responsibleId: responsible.id,
    availability: "in_church",
    availabilityComment: "",
    supplier,
    price,
    serialNumber: buildSerialNumber(index, pair.category.name),
    warrantyUntil: buildWarrantyUntil(index, pair.category.name),
    comment: pickOne(itemComments, index + 29),
    photos: [],
    avatarPhotoId: null,
  }
}

function buildSeedUpdate(
  item: InventoryItem,
  updateIndex: number,
): UpdateInventoryItemInput | null {
  if (updateIndex % 2 === 0 && item.quantity > 1) {
    return { quantity: item.quantity - 1 }
  }

  const nextComment = pickOne(seedUpdateComments, updateIndex + 301)
  if (nextComment === item.comment) {
    return { comment: `${nextComment} (уточнено)` }
  }
  return { comment: nextComment }
}

function generateSeedUpdates(
  createdItems: readonly InventoryItem[],
  excludedIndices: ReadonlySet<number>,
  userEmail: string,
): void {
  const eligibleIndices = createdItems
    .map((_, index) => index)
    .filter((index) => !excludedIndices.has(index))

  const targetUpdateCount = Math.round(SEED_ITEM_COUNT * SEED_UPDATE_RATIO)
  const updateCount = Math.min(targetUpdateCount, eligibleIndices.length)
  if (updateCount <= 0) {
    return
  }

  const pickedEligiblePositions = shuffledIndices(eligibleIndices.length, 31).slice(0, updateCount)

  for (const [updateIndex, eligiblePosition] of pickedEligiblePositions.entries()) {
    const itemIndex = eligibleIndices[eligiblePosition]!
    const seedItem = createdItems[itemIndex]
    if (!seedItem) {
      continue
    }

    const current = getInventoryItemById(seedItem.id)
    if (!current) {
      continue
    }

    const updates = buildSeedUpdate(current, updateIndex)
    if (!updates) {
      continue
    }

    updateInventoryItem(current.id, updates, userEmail)
  }
}

function generateWriteOffBatches(candidates: readonly InventoryItem[], userEmail: string): void {
  for (const [batchIndex, seedItem] of candidates.entries()) {
    const current = getInventoryItemById(seedItem.id)
    if (!current || !isCleanActiveItem(current)) {
      continue
    }

    writeOffItem(
      current.id,
      current.quantity,
      buildRecentIsoDate(batchIndex + 601, 30, 60),
      pickOne(writeOffReasons, batchIndex + 701),
      userEmail,
    )
  }
}

function generateBorrowBatches(candidates: readonly InventoryItem[], userEmail: string): void {
  for (const [batchIndex, seedItem] of candidates.entries()) {
    const current = getInventoryItemById(seedItem.id)
    if (!current || !isCleanActiveItem(current)) {
      continue
    }

    markAsBorrowed(
      current.id,
      current.quantity,
      buildRecentIsoDate(batchIndex + 1201, 7, 30),
      pickOne(borrowedComments, batchIndex + 1301),
      userEmail,
    )
  }
}

function generateRepairBatches(candidates: readonly InventoryItem[], userEmail: string): void {
  for (const [batchIndex, seedItem] of candidates.entries()) {
    const current = getInventoryItemById(seedItem.id)
    if (!current || !isCleanActiveItem(current)) {
      continue
    }

    markAsNeedsRepair(
      current.id,
      current.quantity,
      buildRecentIsoDate(batchIndex + 901, 30, 60),
      pickOne(repairComments, batchIndex + 1001),
      userEmail,
    )
  }
}

/**
 * Creates 20 varied inventory items (and seed taxonomy if storage is empty).
 * Write-off, repair, and borrow each take the full quantity of disjoint items
 * so those statuses never mix on one inventory row.
 * All inventory changes go through inventoryStorage mutators so audit events
 * are recorded automatically.
 */
function generateSeedData(userEmail: string): void {
  const { pairs, locations, responsibles } = ensureSeedTaxonomy()

  const createdItems: InventoryItem[] = []
  for (let index = 0; index < SEED_ITEM_COUNT; index += 1) {
    createdItems.push(
      createInventoryItem(buildItemInput(index, pairs, locations, responsibles), userEmail),
    )
  }

  const shuffled = shuffledIndices(createdItems.length, 17)
  const writeOffItemIndices = shuffled.slice(0, WRITE_OFF_BATCH_COUNT)
  const repairItemIndices = shuffled.slice(
    WRITE_OFF_BATCH_COUNT,
    WRITE_OFF_BATCH_COUNT + REPAIR_BATCH_COUNT,
  )
  const borrowItemIndices = shuffled.slice(
    WRITE_OFF_BATCH_COUNT + REPAIR_BATCH_COUNT,
    WRITE_OFF_BATCH_COUNT + REPAIR_BATCH_COUNT + BORROW_BATCH_COUNT,
  )
  const excludedIndices = new Set([
    ...writeOffItemIndices,
    ...repairItemIndices,
    ...borrowItemIndices,
  ])

  generateSeedUpdates(createdItems, excludedIndices, userEmail)

  const writeOffCandidates = writeOffItemIndices.map((index) => createdItems[index]!)
  const repairCandidates = repairItemIndices.map((index) => createdItems[index]!)
  const borrowCandidates = borrowItemIndices.map((index) => createdItems[index]!)

  generateWriteOffBatches(writeOffCandidates, userEmail)
  generateRepairBatches(repairCandidates, userEmail)
  generateBorrowBatches(borrowCandidates, userEmail)
}

export { generateSeedData, SEED_ITEM_COUNT }
