
'use client'
import React, { useEffect, useRef, useState } from 'react'
import FileTab from './FileTab'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import * as authService from '@/lib/services/auth-service'

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
  
  // Get state and actions from the store
  const tabs = useTabStore(state => state.getAllTabs());
  const activeTabId = useTabStore(state => state.activeTabId);
  const addTab = useTabStore(state => state.addTab);
  const removeTab = useTabStore(state => state.removeTab);
  const activateTab = useTabStore(state => state.activateTab);
  const getTab = useTabStore(state => state.getTab);
  const setOptions = useTabStore(state => state.setOptions);

  // Set options
  useEffect(() => {
    setOptions({
      maxTabs,
      allowDuplicates,
      autoSave
    });
  }, [maxTabs, allowDuplicates, autoSave]);

  // Handle tab events
  const handleTabClick = (tabId: string) => {
    activateTab(tabId);
    
    const tab = getTab(tabId);
    if (tab && onTabChange) {
      onTabChange(tabId, tab);
    }
  };

  const handleTabClose = (tabId: string) => {
    const tab = getTab(tabId);
    if (tab && onTabClose) {
      onTabClose(tabId, tab);
    }
    removeTab(tabId);
  };

  // Allow horizontal scrolling with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  // State for rename dialog
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [currentTab, setCurrentTab] = useState<TabFile | null>(null);

  // Handle file rename
  const handleRename = async (tabId: string) => {
    const tab = getTab(tabId);
    if (tab) {
      setCurrentTab(tab);
      setNewFileName(tab.name);
      setIsRenaming(true);
    }
  };

  // Submit rename
  const submitRename = async () => {
    if (currentTab && newFileName) {
      try {
        const token = authService.getToken();
        const oldPath = currentTab.path;
        const lastSlashIndex = oldPath.lastIndexOf('/');
        const directory = lastSlashIndex >= 0 ? oldPath.substring(0, lastSlashIndex) : '';
        const newPath = `${directory}/${newFileName}`;
        
        // Call backend API to rename file
        const response = await fetch('http://localhost:8000/api/v1/file-explorer/rename-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            old_path: oldPath,
            new_path: newPath,
            root_path: directory
          })
        });

        if (response.ok) {
          // Update tab with new path and name
          const updatedTab = {
            ...currentTab,
            path: newPath,
            name: newFileName,
            extension: newFileName.includes('.') ? newFileName.split('.').pop() || '' : ''
          };
          
          // Update tab in store
          useTabStore.getState().updateTab(currentTab.id, updatedTab);
          
          // Notify parent component
          if (onTabChange) {
            onTabChange(currentTab.id, updatedTab);
          }
        } else {
          console.error('Failed to rename file:', await response.text());
        }
      } catch (error) {
        console.error('Error renaming file:', error);
      } finally {
        setIsRenaming(false);
      }
    }
  };

  // Handle file delete
  const handleDelete = async (tabId: string) => {
    const tab = getTab(tabId);
    if (tab && confirm(`Are you sure you want to delete ${tab.name}?`)) {
      try {
        const token = authService.getToken();
        const filePath = tab.path;
        const lastSlashIndex = filePath.lastIndexOf('/');
        const directory = lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex) : '';
        
        // Call backend API to delete file
        const response = await fetch('/api/v1/file-explorer/delete-file', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            path: filePath,
            root_path: directory
          })
        });

        if (response.ok) {
          // Close the tab
          handleTabClose(tabId);
        } else {
          console.error('Failed to delete file:', await response.text());
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  return (
    <>
      <div 
        className={`flex overflow-x-auto border-b ${className}`}
        onWheel={handleWheel}
        ref={containerRef}
      >
        {tabs.map(tab => (
          
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
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handleRename(tab.id)}>Rename</ContextMenuItem>
              <ContextMenuItem onClick={() => handleDelete(tab.id)}>Delete</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenaming} onOpenChange={(open) => !open && setIsRenaming(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for the file. The file extension will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            />
          </div>
          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                onClick={() => setIsRenaming(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={submitRename}
              >
                Rename
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileTabsStore;
