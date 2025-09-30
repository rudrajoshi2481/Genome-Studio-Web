
'use client'
import React, { useEffect, useRef, useState } from 'react'
import FileTab from './FileTab'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'
import { useDialogStore } from './useDialogStore'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button'
import * as authService from '@/lib/services/auth-service'
import { host, port } from '@/config/server'

interface FileTabsProps {
  initialFiles?: Array<{
    path: string;
    name?: string;
    content?: string;
  }>;
  onTabChange?: (tabId: string, tab: TabFile) => void;
  onTabClose?: (tabId: string, tab: TabFile) => void;
  className?: string;
  maxTabs?: number;
  allowDuplicates?: boolean;
  autoSave?: boolean;
}

const FileTabsStore: React.FC<FileTabsProps> = ({
  initialFiles = [],
  onTabChange,
  onTabClose,
  className = '',
  maxTabs = 20,
  allowDuplicates = false,
  autoSave = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [currentTab, setCurrentTab] = useState<TabFile | null>(null);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const { 
    activeTabId, 
    tabOrder, 
    addTab, 
    removeTab, 
    forceRemoveTab,
    activateTab, 
    getTab, 
    getAllTabs,
    setOptions 
  } = useTabStore();
  
  const { openUnsavedChangesDialog } = useDialogStore();
  const tabs = getAllTabs();

  useEffect(() => {
    setOptions({
      maxTabs,
      allowDuplicates,
      autoSave
    });
  }, [maxTabs, allowDuplicates, autoSave, setOptions]);

  const handleTabClick = (tabId: string) => {
    activateTab(tabId);
    const tab = getTab(tabId);
    if (tab && onTabChange) {
      onTabChange(tabId, tab);
    }
  };

  const handleTabClose = (tabId: string, forceClose = false) => {
    const tab = getTab(tabId);
    if (!tab) return;
    
    if (forceClose) {
      onTabClose?.(tabId, tab);
      forceRemoveTab(tabId);
      return;
    }
    
    const removed = removeTab(tabId);
    
    if (!removed && tab.isDirty) {
      openUnsavedChangesDialog(tabId, tab.name);
    } else if (removed) {
      onTabClose?.(tabId, tab);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  const handleRename = async (tabId: string) => {
    const tab = getTab(tabId);
    if (tab) {
      setCurrentTab(tab);
      setNewFileName(tab.name);
      setIsRenaming(true);
    }
  };

  const handleRenameConfirm = async () => {
    if (currentTab && newFileName.trim()) {
      try {
        const response = await fetch(`http://${host}:${port}/api/files/rename`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authService.getToken()}`
          },
          body: JSON.stringify({
            oldPath: currentTab.path,
            newName: newFileName.trim()
          })
        });

        if (response.ok) {
          const result = await response.json();
          const updatedTab = {
            ...currentTab,
            name: newFileName.trim(),
            path: result.newPath
          };

          if (onTabChange) {
            onTabChange(currentTab.id, updatedTab);
          }
        }
      } catch (error) {
        console.error('Error renaming file:', error);
      }
    }
    
    setIsRenaming(false);
    setCurrentTab(null);
    setNewFileName('');
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setCurrentTab(null);
    setNewFileName('');
  };

  const handleDelete = async (tabId: string) => {
    const tab = getTab(tabId);
    if (!tab) return;

    const confirmed = confirm(`Are you sure you want to delete "${tab.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`http://${host}:${port}/api/files/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({
          path: tab.path
        })
      });

      if (response.ok) {
        handleTabClose(tabId, true);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  useEffect(() => {
    initialFiles.forEach(file => {
      addTab(file.path, file.name, file.content);
    });
  }, [initialFiles, addTab]);

  return (
    <div className={`flex items-center bg-white border-b border-gray-200 ${className}`}>
      <div 
        ref={containerRef}
        className="flex-1 flex items-center overflow-x-auto scrollbar-hide"
        onWheel={handleWheel}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger>
              <FileTab
                id={tab.id}
                name={tab.name}
                path={tab.path}
                extension={tab.extension}
                isActive={tab.id === activeTabId}
                isDirty={tab.isDirty}
                onActivate={handleTabClick}
                onClose={handleTabClose}
              />
            </ContextMenuTrigger>
            {isClient && (
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleRename(tab.id)}>
                  Rename
                </ContextMenuItem>
                <ContextMenuItem 
                  onClick={() => handleTabClose(tab.id, true)}
                  className="text-red-600"
                >
                  Force Close
                </ContextMenuItem>
                <ContextMenuItem 
                  onClick={() => handleDelete(tab.id)}
                  className="text-red-600"
                >
                  Delete File
                </ContextMenuItem>
              </ContextMenuContent>
            )}
          </ContextMenu>
        ))}
      </div>

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for "{currentTab?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new file name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConfirm();
                } else if (e.key === 'Escape') {
                  handleRenameCancel();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRenameCancel}>
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileTabsStore;
