"use client"
import React, { useState } from "react"
import { cn } from "@/lib/utils"

interface HoverBorderGradientProps {
  children: React.ReactNode
  className?: string
}

export function HoverBorderGradient({ children, className }: HoverBorderGradientProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn(
        "relative rounded-lg border border-transparent transition-all duration-300",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient border that appears on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg transition-opacity duration-300 pointer-events-none",
          hovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          padding: "1px",
          background: "linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {children}
    </div>
  )
}
