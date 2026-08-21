import { cn } from "@/lib/utils"

type ChurchLogoProps = {
  src: string
  size: number
  roundedClassName?: string
  className?: string
}

/** Square crop with rounded corners. Survives img { height: auto } from Tailwind preflight. */
export function ChurchLogo({
  src,
  size,
  roundedClassName = "rounded-md",
  className,
}: ChurchLogoProps) {
  return (
    <span
      className={cn("inline-block shrink-0 overflow-hidden bg-muted", roundedClassName, className)}
      style={{ width: size, height: size }}
    >
      <img src={src} alt="" className="size-full object-cover" />
    </span>
  )
}
