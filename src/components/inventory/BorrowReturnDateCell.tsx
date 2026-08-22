import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { isBorrowReturnOverdue } from "@/lib/borrowDates"

type BorrowReturnDateCellProps = {
  returnDate: string | null | undefined
  formattedDate: string
}

export function BorrowReturnDateCell({ returnDate, formattedDate }: BorrowReturnDateCellProps) {
  const { t } = useTranslation()
  const overdue = isBorrowReturnOverdue(returnDate)

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
      {formattedDate}
      {overdue ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex text-red-600 dark:text-red-400">
                <CircleAlert className="size-3.5" aria-hidden />
                <span className="sr-only">{t("inventory.availability.overdueReturn")}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("inventory.availability.overdueReturn")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </span>
  )
}
