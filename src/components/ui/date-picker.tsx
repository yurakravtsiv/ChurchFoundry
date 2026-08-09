import { format } from "date-fns"

// FIXME: Custom Popover + Calendar DatePicker is temporarily disabled (month/year dropdown bug).
// Re-enable after fixing src/components/ui/calendar.tsx caption selects inside Dialog/Popover.

export type DatePickerProps = {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  disabled?: boolean
  placeholder?: string
  /** Inclusive minimum selectable date. */
  fromDate?: Date
  /** Inclusive maximum selectable date. */
  toDate?: Date
  id?: string
  "aria-label"?: string
}

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC off-by-one). */
export function parseDateInputValue(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10))
  if (!match) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Format a Date as YYYY-MM-DD in local time for form storage. */
export function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/*
import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import { enUS, uk } from "react-day-picker/locale"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select date",
  fromDate,
  toDate,
  id,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const { i18n } = useTranslation()
  const locale = i18n.language.startsWith("en") ? enUS : uk
  const now = new Date()
  const startMonth = fromDate ?? new Date(now.getFullYear() - 100, 0)
  const endMonth = toDate ?? new Date(now.getFullYear() + 20, 11)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal shadow-sm",
            "bg-transparent hover:bg-transparent hover:text-foreground",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 size-4" aria-hidden />
          {value ? format(value, "dd.MM.yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[70] w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          locale={locale}
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
          disabled={(date) => {
            const day = startOfLocalDay(date)
            if (fromDate && day < startOfLocalDay(fromDate)) {
              return true
            }
            if (toDate && day > startOfLocalDay(toDate)) {
              return true
            }
            return false
          }}
          startMonth={startMonth}
          endMonth={endMonth}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
*/
