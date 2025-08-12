"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Folder, LucideIcon, Workflow } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Pin, PinOff } from 'lucide-react'
import FileExplorerComponent from './FileExplorer/FileExplorer'
import { FileExplorer_New } from './FileExplorer_New'
import Nodebar from './Nodebar/Nodebar'
import Settings from '../settings/Settings'

/**
 * ToolbarItem represents an item in the sidebar toolbar
 * It can be either a sidebar component or a page route
 */
type ToolbarItem = {
  name: string
  icon: LucideIcon
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
  const { user, isAuthenticated, token, logout } = useAuthStore()
  const [activeItem, setActiveItem] = useState<string>("File Explorer")
  const [pinnedItems, setPinnedItems] = useState<Set<string>>(new Set())




  const TOOLBAR_ITEMS: ToolbarItem[] = [
    {
      name: "File Explorer (New)",
      icon: Folder,
      type: "sidebar",
      component: () => <FileExplorer_New />
    },
    {
      name: "File Explorer (Legacy)",
      icon: Folder,
      type: "sidebar",
      component: () => <FileExplorerComponent />
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

  // Load pinned items from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPinnedItems = localStorage.getItem('toolbar_pinned_items')
        if (savedPinnedItems) {
          const pinnedArray = JSON.parse(savedPinnedItems)
          setPinnedItems(new Set(pinnedArray))
          
          // If there's a pinned item, set it as active
          if (pinnedArray.length > 0) {
            const pinnedItem = TOOLBAR_ITEMS.find(item => pinnedArray.includes(item.name))
            if (pinnedItem && pinnedItem.type === "sidebar") {
              setActiveItem(pinnedItem.name)
              onComponentChange(pinnedItem.component())
              return
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load pinned items from localStorage:', error)
      }
    }
    
    // Fallback: Set File Explorer as active component if no pinned items
    const fileExplorer = TOOLBAR_ITEMS.find(item => item.name === "File Explorer (New)")
    if (fileExplorer && fileExplorer.type === "sidebar") {
      setActiveItem(fileExplorer.name)
      onComponentChange(fileExplorer.component())
    }
  }, [onComponentChange])

  // Handle pin/unpin functionality
  const handlePinToggle = (itemName: string) => {
    const newPinnedItems = new Set(pinnedItems)
    
    if (pinnedItems.has(itemName)) {
      newPinnedItems.delete(itemName)
    } else {
      newPinnedItems.add(itemName)
    }
    
    setPinnedItems(newPinnedItems)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('toolbar_pinned_items', JSON.stringify(Array.from(newPinnedItems)))
      } catch (error) {
        console.warn('Failed to save pinned items to localStorage:', error)
      }
    }
  }

  return (
    <nav className="flex flex-col items-center gap-2 p-2 border-r h-full bg-background justify-between">
     <div className="flex flex-col items-center gap-2">
     {TOOLBAR_ITEMS.map((item) => {
        const isActive = activeItem === item.name
        const isPinned = pinnedItems.has(item.name)
        return (
          <ContextMenu key={item.name}>
            <ContextMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10 p-0 transition-colors relative',
                  isActive && 'bg-muted',
                  isPinned && 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
                )}
                onClick={() => handleItemClick(item)}
                title={`${item.name}${isPinned ? ' (Pinned)' : ''}`}
                aria-label={item.name}
                aria-pressed={isActive}
              >
                <div className="h-4 w-4">
                  {React.createElement(item.icon)}
                </div>
                {isPinned && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-background" />
                )}
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handlePinToggle(item.name)}>
                {isPinned ? (
                  <>
                    <PinOff className="w-4 h-4 mr-2" />
                    Unpin from toolbar
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4 mr-2" />
                    Pin to toolbar
                  </>
                )}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
     </div>
      <div>
      <div>
      <HoverCard>
        <HoverCardTrigger asChild>
          <Avatar className="rounded-lg cursor-pointer">
          <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
          </Avatar>
        </HoverCardTrigger>
        <HoverCardContent side="right" className="w-60">
          <div className="flex space-x-4">
            <Avatar>
              <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
              {/* <AvatarFallback>{getInitials()}</AvatarFallback> */}
            </Avatar>
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-semibold">{user?.full_name || user?.username || 'Guest User'}</h4>
              
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
              
              {/* Display token (truncated for UI) */}
              {/* <div className="mt-2">
                <p className="text-xs font-medium">Token:</p>
                <p className="text-xs break-all bg-gray-100 p-1 rounded">
                  {token ? `${token.substring(0, 20)}...` : 'No token available'}
                </p>
              </div> */}
              {/* <div className="flex items-center justify-between "> */}
                {/* <span className="text-xs text-muted-foreground">ID: {user?.id || 'Not logged in'}</span> */}
                {/* {isAuthenticated && (
                  <button 
                    onClick={logout}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Sign out
                  </button>
                )} */}
              {/* </div> */}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
      </div>
      <div>
        <Settings />
      </div>
      </div>
    </nav>
  )
}

export default Toolbar
