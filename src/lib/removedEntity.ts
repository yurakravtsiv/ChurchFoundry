export function isVisible<T extends { removed?: boolean }>(entity: T): boolean {
  return entity.removed !== true
}

export function filterVisible<T extends { removed?: boolean }>(entities: T[]): T[] {
  return entities.filter(isVisible)
}
