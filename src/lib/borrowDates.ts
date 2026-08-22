import { parseDateInputValue, toDateInputValue } from "@/components/ui/date-picker"

export function isReturnDateAfterBorrowDate(borrowDate: string, returnDate: string): boolean {
  return Boolean(borrowDate && returnDate && returnDate > borrowDate)
}

export function isBorrowReturnOverdue(
  returnDate: string | null | undefined,
  today = toDateInputValue(new Date()),
): boolean {
  return Boolean(returnDate && returnDate < today)
}

export function dayAfter(isoDate: string): string | undefined {
  const date = parseDateInputValue(isoDate)
  if (!date) {
    return undefined
  }
  date.setDate(date.getDate() + 1)
  return toDateInputValue(date)
}
