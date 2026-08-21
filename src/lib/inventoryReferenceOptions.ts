/** Merge a currently selected (possibly removed) entity into a visible options list. */
export function optionsWithCurrent<T extends { id: string }>(
  visible: readonly T[],
  lookups: readonly T[],
  currentId: string | null | undefined,
): T[] {
  if (!currentId) {
    return [...visible]
  }
  if (visible.some((item) => item.id === currentId)) {
    return [...visible]
  }
  const current = lookups.find((item) => item.id === currentId)
  if (!current) {
    return [...visible]
  }
  return [current, ...visible]
}

/**
 * Visible options plus any lookup entities still referenced by items
 * (so filters can isolate rows that use a soft-deleted value).
 */
export function optionsUsedByItems<T extends { id: string }>(
  visible: readonly T[],
  lookups: readonly T[],
  usedIds: Iterable<string>,
): T[] {
  const visibleIds = new Set(visible.map((item) => item.id))
  const extra: T[] = []
  const seen = new Set<string>()
  for (const id of usedIds) {
    if (!id || visibleIds.has(id) || seen.has(id)) {
      continue
    }
    const entity = lookups.find((item) => item.id === id)
    if (entity) {
      extra.push(entity)
      seen.add(id)
    }
  }
  return extra.length === 0 ? [...visible] : [...visible, ...extra]
}
