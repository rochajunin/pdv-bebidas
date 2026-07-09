import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" ? "bg-slate-900 text-white hover:bg-slate-900/90" : "",
          variant === "outline" ? "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900" : "",
          size === "default" ? "h-10 px-4 py-2" : "",
          size === "sm" ? "h-9 rounded-md px-3" : "",
          size === "lg" ? "h-11 rounded-md px-8" : "",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }