import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  archiveInventoryItem,
  createCategory,
  createInventoryItem,
  createLocation,
  createResponsible,
  createSubcategory,
  deleteCategory,
  deleteLocation,
  deleteResponsible,
  deleteSubcategory,
  getCategories,
  getInventoryItems,
  getInventoryReferenceLookups,
  getLocations,
  getResponsibles,
  getSubcategories,
  markAsBorrowed,
  markAsNeedsRepair,
  markAsRepaired,
  returnBorrowed,
  returnToStock,
  unarchiveInventoryItem,
  updateCategory,
  updateInventoryItem,
  updateLocation,
  updateResponsible,
  updateSubcategory,
  writeOffItem,
} from "@/lib/inventoryStorage"
import type { CreateInventoryItemInput, UpdateInventoryItemInput } from "@/types/inventory"

export const inventoryQueryKeys = {
  items: ["inventory-items"] as const,
  categories: ["categories"] as const,
  subcategories: ["subcategories"] as const,
  locations: ["locations"] as const,
  responsibles: ["responsibles"] as const,
  lookups: ["inventory-reference-lookups"] as const,
}

/** Temporary fake latency so skeleton/loading UI is visible during localStorage reads. */
const FAKE_QUERY_DELAY_MS = 800

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function invalidateReferenceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.categories }),
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.subcategories }),
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.locations }),
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.responsibles }),
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lookups }),
  ])
}

async function invalidateInventoryQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
  await queryClient.invalidateQueries({ queryKey: ["events"] })
}

export function useInventoryItemsQuery() {
  return useQuery({
    queryKey: inventoryQueryKeys.items,
    queryFn: async () => {
      await delay(FAKE_QUERY_DELAY_MS)
      return getInventoryItems()
    },
  })
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: inventoryQueryKeys.categories,
    queryFn: async () => {
      await delay(FAKE_QUERY_DELAY_MS)
      return getCategories()
    },
  })
}

export function useSubcategoriesQuery() {
  return useQuery({
    queryKey: inventoryQueryKeys.subcategories,
    queryFn: async () => {
      await delay(FAKE_QUERY_DELAY_MS)
      return getSubcategories()
    },
  })
}

export function useLocationsQuery() {
  return useQuery({
    queryKey: inventoryQueryKeys.locations,
    queryFn: async () => {
      await delay(FAKE_QUERY_DELAY_MS)
      return getLocations()
    },
  })
}

export function useResponsiblesQuery() {
  return useQuery({
    queryKey: inventoryQueryKeys.responsibles,
    queryFn: async () => {
      await delay(FAKE_QUERY_DELAY_MS)
      return getResponsibles()
    },
  })
}

export function useInventoryReferenceLookupsQuery() {
  return useQuery({
    queryKey: inventoryQueryKeys.lookups,
    queryFn: async () => {
      await delay(FAKE_QUERY_DELAY_MS)
      return getInventoryReferenceLookups()
    },
  })
}

export function useCreateInventoryItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      data,
      userEmail,
    }: {
      data: CreateInventoryItemInput
      userEmail: string
    }) => createInventoryItem(data, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useUpdateInventoryItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
      userEmail,
    }: {
      id: string
      data: UpdateInventoryItemInput
      userEmail: string
    }) => updateInventoryItem(id, data, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useArchiveInventoryItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      currentlyArchived,
      userEmail,
    }: {
      id: string
      currentlyArchived: boolean
      userEmail: string
    }) =>
      currentlyArchived
        ? unarchiveInventoryItem(id, userEmail)
        : archiveInventoryItem(id, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useWriteOffItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      writeOffDate,
      writeOffReason,
      userEmail,
    }: {
      id: string
      quantity: number
      writeOffDate: string
      writeOffReason: string
      userEmail: string
    }) => writeOffItem(id, quantity, writeOffDate, writeOffReason, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useReturnToStockMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      writtenOffItemId,
      quantity,
      userEmail,
    }: {
      writtenOffItemId: string
      quantity: number
      userEmail: string
    }) => returnToStock(writtenOffItemId, quantity, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useMarkAsNeedsRepairMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      repairDate,
      repairComment,
      userEmail,
    }: {
      id: string
      quantity: number
      repairDate: string
      repairComment: string
      userEmail: string
    }) => markAsNeedsRepair(id, quantity, repairDate, repairComment, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useMarkAsRepairedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      repairItemId,
      quantity,
      userEmail,
    }: {
      repairItemId: string
      quantity: number
      userEmail: string
    }) => markAsRepaired(repairItemId, quantity, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useMarkAsBorrowedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      borrowDate,
      returnDate,
      availabilityComment,
      userEmail,
    }: {
      id: string
      quantity: number
      borrowDate: string
      returnDate: string
      availabilityComment: string
      userEmail: string
    }) => markAsBorrowed(id, quantity, borrowDate, returnDate, availabilityComment, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useReturnBorrowedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      borrowedItemId,
      quantity,
      userEmail,
    }: {
      borrowedItemId: string
      quantity: number
      userEmail: string
    }) => returnBorrowed(borrowedItemId, quantity, userEmail),
    onSuccess: async () => {
      await invalidateInventoryQueries(queryClient)
    },
  })
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => createCategory(name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useCreateSubcategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) =>
      createSubcategory(categoryId, name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useCreateLocationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => createLocation(name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useCreateResponsibleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => createResponsible(name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => updateCategory(id, name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useUpdateSubcategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => updateSubcategory(id, name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useUpdateLocationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => updateLocation(id, name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useUpdateResponsibleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => updateResponsible(id, name),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => deleteCategory(id),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useDeleteSubcategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => deleteSubcategory(id),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useDeleteLocationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => deleteLocation(id),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}

export function useDeleteResponsibleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => deleteResponsible(id),
    onSuccess: async () => {
      await invalidateReferenceQueries(queryClient)
    },
  })
}
