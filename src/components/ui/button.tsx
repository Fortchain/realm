"use client"

import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "glow" | "danger"
  size?: "xs" | "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-indigo-600 hover:bg-indigo-500 text-white": variant === "default",
          "border border-white/20 bg-white/5 hover:bg-white/10 text-white": variant === "outline",
          "bg-transparent hover:bg-white/5 text-white/60 hover:text-white": variant === "ghost",
          "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]": variant === "glow",
          "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20": variant === "danger",
        },
        {
          "px-2 py-1 text-xs": size === "xs",
          "px-3 py-1.5 text-sm": size === "sm",
          "px-5 py-2.5 text-sm": size === "md",
          "px-7 py-3.5 text-base": size === "lg",
        },
        className
      )}
      {...props}
    />
  )
)
Button.displayName = "Button"
