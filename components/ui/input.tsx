import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, style, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg px-3 py-2 text-sm transition-all duration-150 placeholder:text-[var(--muted)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
        boxShadow: 'none',
        ...style,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'rgba(245, 154, 35, 0.5)'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 154, 35, 0.1)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
