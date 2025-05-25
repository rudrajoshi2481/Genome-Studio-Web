"use client"

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import { Folder, MessageSquare, Box, Settings, LucideIcon, Workflow } from 'lucide-react'
import { AIChat } from '../ai/ai-chat'
import { useRouter } from 'next/navigation'
import Nodebar from "./nodebar/Nodebar"
import FileExplorer from '../fileexplorer/FileExplorer'

/**
 * ToolbarItem represents an item in the sidebar toolbar
 * It can be either a sidebar component or a page route
 */
type ToolbarItem = {
  name: string
  icon: LucideIcon
  type: 'sidebar' | 'page'
} & (
  | { type: 'sidebar', component: () => React.ReactNode }
  | { type: 'page', link: string }
)

interface ToolbarProps {
  /** Callback when a sidebar component is selected */
  onComponentChange: (component: React.ReactNode) => void
}

/**
 * Toolbar component that displays sidebar navigation items
 * Handles both sidebar components and page navigation
 */
function Toolbar({ onComponentChange }: ToolbarProps) {
  const router = useRouter()
  const [activeItem, setActiveItem] = useState<string>("File Explorer")

  const TOOLBAR_ITEMS: ToolbarItem[] = [
  // Define items outside component for better performance
  
    {
      name: "File Explorer",
      icon: Folder,
      type: "sidebar",
      component: () => <FileExplorer />
    },
    {
      name: "AI Chat",
      icon: MessageSquare,
      type: "sidebar",
      component: () => <AIChat />
    },
    {
      name: "Nodebar",
      icon: Workflow,
      type: "sidebar",
      component: () => <Nodebar />
    },
   
    // {
    //   name: "Settings",
    //   icon: Settings,
    //   type: "page",
    //   link: "/settings"
    // }
  ]

  /**
   * Handle toolbar item click
   * For sidebar items: renders the component in the sidebar
   * For page items: navigates to the corresponding route
   */
  const handleItemClick = (item: ToolbarItem) => {
    setActiveItem(item.name)
    
    if (item.type === 'sidebar') {
      onComponentChange(item.component())
    } else {
      router.push(item.link)
    }
  }

  // Set File Explorer as active component on mount
  React.useEffect(() => {
    const fileExplorer = TOOLBAR_ITEMS.find(item => item.name === "File Explorer")
    if (fileExplorer && fileExplorer.type === "sidebar") {
      onComponentChange(fileExplorer.component())
    }
  }, [])

  // React.useEffect(() => {
  //   const nodebar = TOOLBAR_ITEMS.find(item => item.name === "Nodebar")
  //   if (nodebar && nodebar.type === "sidebar") {
  //     onComponentChange(nodebar.component())
  //   }
  // }, [])

  return (
    <nav className="flex flex-col items-center gap-2 p-2 border-r h-full bg-background">
      {TOOLBAR_ITEMS.map((item) => {
        const isActive = activeItem === item.name
        return (
          <Button
            key={item.name}
            variant="ghost"
            size="icon"
            className={cn(
              'h-10 w-10 p-0 transition-colors',
              isActive && 'bg-muted'
            )}
            onClick={() => handleItemClick(item)}
            title={item.name}
            aria-label={item.name}
            aria-pressed={isActive}
          >
            <div className="h-4 w-4">
              {item.icon && <item.icon />}
            </div>
          </Button>
        )
      })}
    </nav>
  )
}

export default Toolbar