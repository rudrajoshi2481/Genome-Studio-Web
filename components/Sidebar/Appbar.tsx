import React from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Search } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

function Appbar() {
  // Get user data from auth store
  const { user, isAuthenticated, logout } = useAuthStore();
  
  // Detect OS for keyboard shortcut display
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Generate initials for avatar fallback
  const getInitials = () => {
    if (!user || !user.full_name) return 'GS';
    
    return user.full_name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle opening command palette
  const handleOpenCommandPalette = () => {
    // Trigger Ctrl+P / Cmd+P keyboard event to open command palette
    const event = new KeyboardEvent('keydown', {
      key: 'p',
      code: 'KeyP',
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  };

  return (
    <div className="p-2 border-b flex justify-between items-center relative">
      <div className=''>
        <span className="font-semibold text-sm">Genome Studio<span className="text-xs text-muted-foreground ml-2">v1.0.0</span></span>
      </div>
      
      {/* Command Palette Shortcut Indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent cursor-pointer transition-colors"
              onClick={handleOpenCommandPalette}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span>
                  {!isMac && <span>+</span>}
                  P
                </kbd>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Open Command Palette</p>
            <p className="text-muted-foreground mt-1">Search files or run commands</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export default Appbar