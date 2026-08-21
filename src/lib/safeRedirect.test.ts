import { describe, expect, it } from "vitest"

import { getSafeRedirectPath } from "@/lib/safeRedirect"

describe("getSafeRedirectPath", () => {
  it("accepts internal app paths", () => {
    expect(getSafeRedirectPath("/inventory/abc")).toBe("/inventory/abc")
    expect(getSafeRedirectPath("/inventory/abc?tab=1")).toBe("/inventory/abc?tab=1")
    expect(getSafeRedirectPath("/settings")).toBe("/settings")
  })

  it("rejects missing, external, and protocol-relative values", () => {
    expect(getSafeRedirectPath(null)).toBeNull()
    expect(getSafeRedirectPath(undefined)).toBeNull()
    expect(getSafeRedirectPath("")).toBeNull()
    expect(getSafeRedirectPath("https://evil.example")).toBeNull()
    expect(getSafeRedirectPath("//evil.example")).toBeNull()
    expect(getSafeRedirectPath("/\\evil.example")).toBeNull()
    expect(getSafeRedirectPath("inventory/abc")).toBeNull()
  })

  it("rejects the login route to avoid a redirect loop", () => {
    expect(getSafeRedirectPath("/login")).toBeNull()
    expect(getSafeRedirectPath("/login?next=/inventory/1")).toBeNull()
  })
})
