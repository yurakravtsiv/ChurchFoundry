import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getChurchProfile, saveChurchProfile } from "@/lib/churchProfileStorage"
import type { ChurchProfile } from "@/types/church"

export const churchProfileQueryKeys = {
  profile: ["church-profile"] as const,
}

export function useChurchProfileQuery() {
  return useQuery({
    queryKey: churchProfileQueryKeys.profile,
    queryFn: getChurchProfile,
    initialData: getChurchProfile,
  })
}

export function useSaveChurchProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profile: ChurchProfile) => saveChurchProfile(profile),
    onSuccess: (saved) => {
      queryClient.setQueryData(churchProfileQueryKeys.profile, saved)
    },
  })
}
