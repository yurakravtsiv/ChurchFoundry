/** Returns an in-app path, or null if the value is missing / unsafe for post-login redirect. */
export function getSafeRedirectPath(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed.startsWith("/")) {
    return null
  }
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null
  }
  if (trimmed.includes("\\") || trimmed.includes("://")) {
    return null
  }
  if (trimmed === "/login" || trimmed.startsWith("/login?")) {
    return null
  }

  return trimmed
}
