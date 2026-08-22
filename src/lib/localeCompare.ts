export function compareLocaleText(a: string, b: string, locale: string) {
  return a.localeCompare(b, locale, { sensitivity: "base" })
}

export function sortByName<T extends { name: string }>(items: readonly T[], locale: string): T[] {
  return [...items].sort((a, b) => compareLocaleText(a.name, b.name, locale))
}
