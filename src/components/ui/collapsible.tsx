import * as React from "react"

import { cn } from "@/lib/utils"

type CollapsibleContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null)

function useCollapsibleContext() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("Collapsible components must be used within Collapsible")
  }
  return context
}

type CollapsibleProps = React.HTMLAttributes<HTMLDivElement> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open, defaultOpen = false, onOpenChange, className, children, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
    const isControlled = open !== undefined
    const currentOpen = isControlled ? open : internalOpen

    const handleOpenChange = React.useCallback(
      (next: boolean) => {
        if (!isControlled) {
          setInternalOpen(next)
        }
        onOpenChange?.(next)
      },
      [isControlled, onOpenChange],
    )

    return (
      <CollapsibleContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
        <div
          ref={ref}
          data-state={currentOpen ? "open" : "closed"}
          className={cn(className)}
          {...props}
        >
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  },
)
Collapsible.displayName = "Collapsible"

type CollapsibleTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ className, type = "button", onClick, ...props }, ref) => {
    const { open, onOpenChange } = useCollapsibleContext()

    return (
      <button
        ref={ref}
        type={type}
        className={cn(className)}
        aria-expanded={open}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) {
            onOpenChange(!open)
          }
        }}
        {...props}
      />
    )
  },
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

type CollapsibleContentProps = React.HTMLAttributes<HTMLDivElement>

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open } = useCollapsibleContext()
    if (!open) {
      return null
    }

    return (
      <div ref={ref} className={cn(className)} {...props}>
        {children}
      </div>
    )
  },
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
