'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import Image from 'next/image'

interface ThemeAwareLogoProps {
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export function ThemeAwareLogo({
  className,
  width = 120,
  height = 60,
  priority = false,
}: ThemeAwareLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'
  const logoSrc = isDark ? '/white_bioinformatics_studio.svg' : '/black_bioinformatics_studio.svg'

  if (!mounted) {
    return (
      <div
        className={className}
        style={{ width, height }}
        aria-hidden
      />
    )
  }

  return (
    <Image
      src={logoSrc}
      alt="Bioinformatics Studio"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
