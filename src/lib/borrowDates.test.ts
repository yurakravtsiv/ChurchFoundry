import { describe, expect, it } from "vitest"

import { dayAfter, isBorrowReturnOverdue, isReturnDateAfterBorrowDate } from "@/lib/borrowDates"

describe("borrowDates", () => {
  it("requires the return date to be after the borrow date", () => {
    expect(isReturnDateAfterBorrowDate("2026-08-01", "2026-08-02")).toBe(true)
    expect(isReturnDateAfterBorrowDate("2026-08-01", "2026-08-01")).toBe(false)
    expect(isReturnDateAfterBorrowDate("2026-08-02", "2026-08-01")).toBe(false)
  })

  it("treats a return date before today as overdue", () => {
    expect(isBorrowReturnOverdue("2026-08-01", "2026-08-23")).toBe(true)
    expect(isBorrowReturnOverdue("2026-08-23", "2026-08-23")).toBe(false)
    expect(isBorrowReturnOverdue("2026-08-24", "2026-08-23")).toBe(false)
    expect(isBorrowReturnOverdue(null, "2026-08-23")).toBe(false)
  })

  it("returns the next calendar day", () => {
    expect(dayAfter("2026-08-01")).toBe("2026-08-02")
    expect(dayAfter("2026-08-31")).toBe("2026-09-01")
  })
})
