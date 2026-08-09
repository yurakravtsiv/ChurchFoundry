import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  archiveInventoryItem,
  createCategory,
  createInventoryItem,
  createLocation,
  createSubcategory,
  getCategories,
  getInventoryItems,
  getLocations,
  getSubcategories,
  markAsNeedsRepair,
  markAsRepaired,
  returnToStock,
  unarchiveInventoryItem,
  updateInventoryItem,
  writeOffItem,
} from "@/lib/inventoryStorage"
import type { CreateInventoryItemInput, UpdateInventoryItemInput } from "@/types/inventory"

export const inventoryQueryKeys = {
  items: ["inventory-items"] as const,
  categories: ["categories"] as const,
  subcategories: ["subcategories"] as const,
  locations: ["locations"] as const,
}

/** Temporary fake latency so skeleton/loading UI is visible during localStorage reads. */
const FAKE_QUERY_DELAY_MS = 800

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
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

export function useCreateInventoryItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateInventoryItemInput) => createInventoryItem(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
    },
  })
}

export function useUpdateInventoryItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInventoryItemInput }) =>
      updateInventoryItem(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
    },
  })
}

export function useArchiveInventoryItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, currentlyArchived }: { id: string; currentlyArchived: boolean }) =>
      currentlyArchived ? unarchiveInventoryItem(id) : archiveInventoryItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
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
    }: {
      id: string
      quantity: number
      writeOffDate: string
      writeOffReason: string
    }) => writeOffItem(id, quantity, writeOffDate, writeOffReason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
    },
  })
}

export function useReturnToStockMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (writtenOffItemId: string) => returnToStock(writtenOffItemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
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
    }: {
      id: string
      quantity: number
      repairDate: string
      repairComment: string
    }) => markAsNeedsRepair(id, quantity, repairDate, repairComment),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
    },
  })
}

export function useMarkAsRepairedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (repairItemId: string) => markAsRepaired(repairItemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items })
    },
  })
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => createCategory(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.categories })
    },
  })
}

export function useCreateSubcategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) =>
      createSubcategory(categoryId, name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.subcategories })
    },
  })
}

export function useCreateLocationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => createLocation(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.locations })
    },
  })
}
