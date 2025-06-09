"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Folder, MessageSquare, Box, Settings, LucideIcon, Workflow } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import FileExplorerComponent from './FileExplorer/FileExplorer'

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


  // Define placeholder components for demonstration
//   const FileExplorer = () => <FileExplorerComponent />
  const AIChat = () => <div>AI Chat Component</div>
  const Nodebar = () => <div>Nodebar Component</div>


  const TOOLBAR_ITEMS: ToolbarItem[] = [
    {
      name: "File Explorer",
      icon: Folder,
      type: "sidebar",
      component: () => <FileExplorerComponent />
    // component: () => <div>File Explorer Component</div>
    },
    // {
    //   name: "AI Chat",
    //   icon: MessageSquare,
    //   type: "sidebar",
    //   component: () => <AIChat />
    // },
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
  useEffect(() => {
    const fileExplorer = TOOLBAR_ITEMS.find(item => item.name === "File Explorer")
    if (fileExplorer && fileExplorer.type === "sidebar") {
      onComponentChange(fileExplorer.component())
    }
  }, [onComponentChange])

  return (
    <nav className="flex flex-col items-center gap-2 p-2 border-r h-full bg-background justify-between">
     <div className="flex flex-col items-center gap-2">
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
              {React.createElement(item.icon)}
            </div>
          </Button>
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
        <Button variant="ghost" size="icon"> <Settings /></Button>
      </div>
      </div>
    </nav>
  )
}

export default Toolbar
