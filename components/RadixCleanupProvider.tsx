"use client"

import { useRadixCleanup } from "@/lib/hooks/useRadixCleanup"

export function RadixCleanupProvider() {
  useRadixCleanup()
  return null
}
