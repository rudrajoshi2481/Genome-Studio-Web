"use client"

import React, { useRef } from 'react'
import PackageManagerPage from '@/components/PackageManager/PackageManagerPage'

/**
 * /extensions-hub — Package Manager page.
 *
 * Opens as a standalone page (no app shell). The Toolbar's "Extensions Hub"
 * entry (page type) opens this in a new tab.
 */
function ExtensionsHubPage() {
  // Ref to the "open New Project dialog" function, registered by PackageManagerPage
  const openNewProjectRef = useRef<(() => void) | null>(null)

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 min-h-0">
        <PackageManagerPage onRegisterNewProjectOpener={(open) => { openNewProjectRef.current = open }} />
      </div>
    </div>
  )
}

export default ExtensionsHubPage
