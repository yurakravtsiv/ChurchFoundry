import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type DisabledTooltipProps = {
  disabled: boolean
  tip: string
  children: ReactNode
  className?: string
}

/** Wraps a disabled control so hover/focus still shows an explanatory tooltip. */
export function DisabledTooltip({ disabled, tip, children, className }: DisabledTooltipProps) {
  if (!disabled) {
    return <>{children}</>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("block w-full cursor-not-allowed", className)}>{children}</span>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
