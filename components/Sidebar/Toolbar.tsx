"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Folder, LucideIcon, Workflow,KanbanSquare, PackageSearch, Warehouse } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { host, port } from '@/config/server'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Pin, PinOff,GitCompareArrows,AtomIcon } from 'lucide-react'
import FileExplorerComponent from './FileExplorer/FileExplorer'
import { FileExplorer_New } from './FileExplorer_New'
import { useFileExplorerStore } from './FileExplorer_New/store/fileExplorerStore'
import { UploadProgressIndicator } from './FileExplorer_New/components/UploadProgressIndicator'
import Nodebar from './Nodebar/Nodebar'
import Settings from '../settings/Settings'
import PackageManager from './PackageManager/PackageManager'

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

  // Get the full avatar URL
  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return '';
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `http://${host}:${port}${avatarPath}`;
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user) return 'U';
    if (user.full_name) {
      const parts = user.full_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return user.username?.substring(0, 2).toUpperCase() || 'U';
  };
  const [activeItem, setActiveItem] = useState<string>("File Explorer")
  const [pinnedItems, setPinnedItems] = useState<Set<string>>(new Set())
  
  // Get upload progress from file explorer store
  const uploadProgress = useFileExplorerStore((state) => state.uploadProgress)




  const TOOLBAR_ITEMS: ToolbarItem[] = [
    {
      name: "File Explorer (New)",
      icon: Folder,
      type: "sidebar",
      component: () => <FileExplorer_New />
    },
    // {
    //   name: "File Explorer (Legacy)",
    //   icon: Folder,
    //   type: "sidebar",
    //   component: () => <FileExplorerComponent />
    // },
    {
      name: "Nodebar",
      icon: Workflow,
      type: "sidebar",
      component: () => <Nodebar />
    },
    {
      name: "Package Manager",
      icon: PackageSearch,
      type: "sidebar",
      component: () =>  <PackageManager />
    },
    {
      name: "Storage Bucket",
      icon: Warehouse,
      type: "sidebar",
      component: () => <>Directly mount storage bucket to any folder Google Drive / S3 Bucket etc...</>
    },
    // {
    //   name: "Git",
    //   icon: GitCompareArrows,
    //   type: "sidebar",
    //   component: () => <>Dummy git component</>
    // },
    // {
    //   name: "Planning Board",
    //   icon: KanbanSquare,
    //   type: "sidebar",
    //   component: () => <>Dummy planning board component</>
    // },
    // {
    //   name: "Pipeline Monitor",
    //   icon: AtomIcon,
    //   type: "page",
    //   link: "/pipeline-monitor"
    // },
    

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

  // Handle pin/unpin functionality - only one item can be pinned at a time
  const handlePinToggle = (itemName: string) => {
    let newPinnedItems: Set<string>
    
    if (pinnedItems.has(itemName)) {
      // Unpin the item
      newPinnedItems = new Set()
    } else {
      // Pin the new item (replaces any previously pinned item)
      newPinnedItems = new Set([itemName])
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
                {/* Show upload progress indicator for File Explorer */}
                {item.name === "File Explorer (New)" && uploadProgress.isUploading && (
                  <UploadProgressIndicator {...uploadProgress} />
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
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.username || 'User'} />
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
        </HoverCardTrigger>
        <HoverCardContent side="right" className="w-64">
          <div className="flex gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.username || 'User'} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-semibold">{user?.full_name || user?.username || 'Guest User'}</h4>
              <p className="text-xs text-muted-foreground">@{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
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
