import { Skeleton } from "@/components/ui/skeleton"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TableSkeletonProps = {
  rows?: number
  columns: number
  /** Optional per-column Skeleton width classes (falls back to w-full). */
  columnClassNames?: Array<string | undefined>
}

export function TableSkeleton({ rows = 8, columns, columnClassNames }: TableSkeletonProps) {
  const rowKeys = Array.from({ length: rows }, (_, index) => `skeleton-row-${index + 1}`)
  const columnKeys = Array.from({ length: columns }, (_, index) => `skeleton-col-${index + 1}`)

  return (
    <TableBody>
      {rowKeys.map((rowKey) => (
        <TableRow key={rowKey} className="hover:bg-transparent">
          {columnKeys.map((columnKey, columnIndex) => (
            <TableCell key={`${rowKey}-${columnKey}`}>
              <Skeleton className={cn("h-4", columnClassNames?.[columnIndex] ?? "w-full")} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}
