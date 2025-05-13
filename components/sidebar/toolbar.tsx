"use client"

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import { Folder, MessageSquare, Box, Settings, LucideIcon } from 'lucide-react'
import { AIChat } from '../ai/ai-chat'
import { useRouter } from 'next/navigation'

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
  const [activeItem, setActiveItem] = useState<string | null>(null)

  const TOOLBAR_ITEMS: ToolbarItem[] = [
    {
      name: "File Explorer",
      icon: Folder,
      type: "sidebar",
      component: () => <div>File Explorer</div>
    },
    {
      name: "AI Chat",
      icon: MessageSquare,
      type: "sidebar",
      component: () => <div><AIChat /></div>
    },
    {
      name: "Manage Container",
      icon: Box,
      type: "page",
      link: "/manage-container"
    },
    {
      name: "Settings",
      icon: Settings,
      type: "page",
      link: "/settings"
    }
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