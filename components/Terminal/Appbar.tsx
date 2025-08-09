import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TerminalIcon, X as CloseIcon, Pencil, Trash2 } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function Appbar() {
  const { tabs, activeTabId, createTab, closeTab, setActiveTab, renameTab } = useTerminalStore();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [tabToRename, setTabToRename] = useState<{id: string, name: string} | null>(null);
  const [newTabName, setNewTabName] = useState('');
  
  const handleCreateNewTab = () => {
    createTab();
    toast.success(`New terminal created`);
  };
  
  const handleRename = () => {
    if (tabToRename && newTabName.trim()) {
      renameTab(tabToRename.id, newTabName.trim());
      toast.success(`Renamed tab to "${newTabName.trim()}"`); 
      setIsRenameDialogOpen(false);
    }
  };
  
  return (
    <>
      <div className='flex justify-between border-b w-full p-1 pr-3'>
        <div>
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger>
                  <div 
                    className={cn(
                      "flex items-center px-3 py-1.5 text-xs rounded-t-md cursor-pointer",
                      tab.id === activeTabId 
                        ? "bg-background border-b-2 border-primary" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="mr-1 max-w-[100px] truncate">{tab.name}</span>
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
                    variant="destructive"
                    onClick={() => {
                      closeTab(tab.id);
                      toast.info(`Closed terminal tab: ${tab.name}`);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant='ghost' 
                  size='icon'
                  onClick={handleCreateNewTab}
                >
                  <TerminalIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Terminal</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Separator orientation="vertical" />
          <TerminalStyleStats 
            refreshInterval={3000}
          />
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