import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { TerminalIcon, X as CloseIcon, Pencil, Trash2, Pin, PinOff, ChevronDown, Zap, Box, XCircle, ArrowRight, Layers } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useTerminalStore } from './store/terminal-store'
import { toast } from "sonner"
import { cn } from '@/lib/utils'
import TerminalStyleStats from './SystemStats/TerminalStyleStats'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function Appbar() {
  const { tabs, activeTabId, createTab, closeTab, setActiveTab, renameTab } = useTerminalStore();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [tabToRename, setTabToRename] = useState<{id: string, name: string} | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(new Set());
  
  const handleCreateNewTab = (type: 'tmux' | 'simple' = 'tmux') => {
    const terminalName = type === 'tmux' ? 'Tmux Terminal' : 'Bash Terminal';
    createTab(terminalName, type);
    toast.success(`${terminalName} created`);
  };
  
  const handleRename = () => {
    if (tabToRename && newTabName.trim()) {
      renameTab(tabToRename.id, newTabName.trim());
      toast.success(`Renamed tab to "${newTabName.trim()}"`); 
      setIsRenameDialogOpen(false);
    }
  };

  // Load pinned tabs from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPinnedTabs = localStorage.getItem('terminal_pinned_tabs');
        if (savedPinnedTabs) {
          const pinnedArray = JSON.parse(savedPinnedTabs);
          setPinnedTabs(new Set(pinnedArray));
        }
      } catch (error) {
        console.warn('Failed to load pinned terminal tabs from localStorage:', error);
      }
    }
  }, []);

  // Handle pin/unpin functionality for terminal tabs - only one tab can be pinned at a time
  const handlePinToggle = (tabId: string) => {
    let newPinnedTabs: Set<string>;
    
    if (pinnedTabs.has(tabId)) {
      // Unpin the tab
      newPinnedTabs = new Set();
      toast.info('Terminal tab unpinned');
    } else {
      // Pin the new tab (replaces any previously pinned tab)
      newPinnedTabs = new Set([tabId]);
      toast.success('Terminal tab pinned');
    }
    
    setPinnedTabs(newPinnedTabs);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('terminal_pinned_tabs', JSON.stringify(Array.from(newPinnedTabs)));
      } catch (error) {
        console.warn('Failed to save pinned terminal tabs to localStorage:', error);
      }
    }
  };

  // Close all tabs to the right of the specified tab
  const handleCloseTabsToRight = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1 || tabIndex === tabs.length - 1) return;
    
    const tabsToClose = tabs.slice(tabIndex + 1);
    tabsToClose.forEach(tab => closeTab(tab.id));
    toast.success(`Closed ${tabsToClose.length} tab(s) to the right`);
  };

  // Close all other tabs except the specified one
  const handleCloseOtherTabs = (tabId: string) => {
    const otherTabs = tabs.filter(t => t.id !== tabId);
    otherTabs.forEach(tab => closeTab(tab.id));
    toast.success(`Closed ${otherTabs.length} other tab(s)`);
  };

  // Close all tabs
  const handleCloseAllTabs = () => {
    const tabCount = tabs.length;
    tabs.forEach(tab => closeTab(tab.id));
    toast.success(`Closed all ${tabCount} tab(s)`);
  };
  
  return (
    <>
      <div className='flex justify-between border-b w-full p-1 pr-3'>
        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isPinned = pinnedTabs.has(tab.id);
              return (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger>
                  <div 
                    className={cn(
                      "flex items-center px-3 py-1.5 text-xs rounded-t-md cursor-pointer relative",
                      tab.id === activeTabId 
                        ? "bg-background border-b-2 border-primary" 
                        : "bg-muted/50 hover:bg-muted",
                      isPinned && "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                    title={`${tab.name}${isPinned ? ' (Pinned)' : ''}`}
                  >
                    <span className="mr-1 max-w-[100px] truncate">{tab.name}</span>
                    {isPinned && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-background" />
                    )}
                    <button 
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                        toast.info(`Closed terminal tab: ${tab.name}`);
                      }}
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  <ContextMenuItem
                    onClick={() => handlePinToggle(tab.id)}
                  >
                    {isPinned ? (
                      <>
                        <PinOff className="mr-2 h-4 w-4" />
                        Unpin tab
                      </>
                    ) : (
                      <>
                        <Pin className="mr-2 h-4 w-4" />
                        Pin tab
                      </>
                    )}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => {
                      setTabToRename({id: tab.id, name: tab.name});
                      setNewTabName(tab.name);
                      setIsRenameDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => closeTab(tab.id)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Close
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handleCloseOtherTabs(tab.id)}
                    disabled={tabs.length <= 1}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    Close Others
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handleCloseTabsToRight(tab.id)}
                    disabled={tabs.findIndex(t => t.id === tab.id) === tabs.length - 1}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Close to the Right
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={handleCloseAllTabs}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Close All
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              );
            })}
          </div>
          {/* Gradient fade indicator for overflow */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
        <div className='flex items-center gap-2'>
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-r-none border-r-0"
                  onClick={() => handleCreateNewTab('simple')}
                >
                  <TerminalIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Bash Terminal</p>
              </TooltipContent>
            </Tooltip>
            
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-l-none px-2"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>More Options</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>New Terminal</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => handleCreateNewTab('tmux')}>
                    <Zap className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Tmux Terminal</span>
                      <span className="text-xs text-muted-foreground">Persistent session</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreateNewTab('simple')}>
                    <Box className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Bash Terminal</span>
                      <span className="text-xs text-muted-foreground">Non-persistent</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Separator orientation="vertical" />
          <TerminalStyleStats />
        </div>
      </div>
      
      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Terminal Tab</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Input
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="Enter new tab name"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



export default Appbar