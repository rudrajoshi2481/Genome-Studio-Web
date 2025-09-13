
'use client'
import React, { useEffect, useRef, useState } from 'react'
import FileTab from './FileTab'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

// SSR-safe client check hook
const useIsClient = () => {
  const [isClient, setIsClient] = React.useState(false)
  
  React.useEffect(() => {
    setIsClient(true)
  }, [])
  
  return isClient
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import * as authService from '@/lib/services/auth-service'
import { host, port } from '@/config/server'
import UnsavedChangesDialog from './UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { useEditorContext } from '@/components/Editorwindow_new/context/EditorContext'

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
  const isClient = useIsClient(); // SSR protection for context menus
  
  // Get editor context at the top level
  let editorContext: any = null;
  try {
    editorContext = useEditorContext();
  } catch (error) {
    // Editor context not available (e.g., not within EditorProvider)
    console.warn('EditorContext not available in FileTabs');
  }
  
  // Get state and actions from the store
  const { 
    activeTabId, 
    tabOrder, 
    addTab, 
    removeTab, 
    forceRemoveTab,
    activateTab, 
    getTab, 
    getAllTabs,
    setTabDirty,
    setOptions 
  } = useTabStore();
  
  // Get tabs as array for rendering
  const tabs = getAllTabs();

  // State for unsaved changes dialog - MUST be declared before use
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);

  // State for rename dialog
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [currentTab, setCurrentTab] = useState<TabFile | null>(null);

  // Set options
  useEffect(() => {
    setOptions({
      maxTabs,
      allowDuplicates,
      autoSave
    });
  }, [maxTabs, allowDuplicates, autoSave, setOptions]);

  // Handle tab events
  const handleTabClick = (tabId: string) => {
    activateTab(tabId);
    
    const tab = getTab(tabId);
    if (tab && onTabChange) {
      onTabChange(tabId, tab);
    }
  };

  const handleTabClose = (tabId: string, forceClose = false) => {
    const tab = getTab(tabId);
    
    console.log('🔍 FileTabs: Attempting to close tab:', tabId, 'isDirty:', tab?.isDirty, 'forceClose:', forceClose, 'tab:', tab);
    
    // Check if tab has unsaved changes (unless force closing)
    if (tab && tab.isDirty && !forceClose) {
      console.log('✋ FileTabs: Tab is dirty, showing unsaved changes dialog');
      setTabToClose(tabId);
      setShowUnsavedDialog(true);
      return;
    }
    
    console.log('✅ FileTabs: Closing tab immediately');
    // Close tab immediately if no unsaved changes or force closing
    if (tab && onTabClose) {
      onTabClose(tabId, tab);
    }
    
    if (forceClose) {
      forceRemoveTab(tabId);
    } else {
      removeTab(tabId);
    }
  };

  // Handle unsaved changes dialog actions
  const handleSaveAndClose = async () => {
    if (tabToClose) {
      const tab = getTab(tabToClose);
      
      // Try to save using the editor context
      if (editorContext) {
        try {
          const saveSuccess = await editorContext.saveTab(tabToClose);
          
          if (saveSuccess) {
            // Save successful, now close the tab
            if (tab && onTabClose) {
              onTabClose(tabToClose, tab);
            }
            removeTab(tabToClose);
          } else {
            // Save failed, don't close the tab
            console.error('Failed to save tab:', tabToClose);
            return;
          }
        } catch (error) {
          console.error('Error saving tab:', error);
          return;
        }
      } else {
        // If editor context is not available, fall back to old behavior
        console.warn('Editor context not available, using fallback save method');
        if (tab && onTabClose) {
          onTabClose(tabToClose, tab);
        }
        removeTab(tabToClose);
      }
    }
    setShowUnsavedDialog(false);
    setTabToClose(null);
  };

  const handleCloseAnyway = () => {
    console.log('🗑️ FileTabs: handleCloseAnyway called for tab:', tabToClose);
    if (tabToClose) {
      const tab = getTab(tabToClose);
      console.log('📋 FileTabs: Tab to close:', tab);
      if (tab && onTabClose) {
        onTabClose(tabToClose, tab);
      }
      // Use forceRemoveTab to bypass dirty check since user confirmed
      console.log('🔥 FileTabs: Force removing tab...');
      const removed = forceRemoveTab(tabToClose);
      console.log('✅ FileTabs: Tab removal result:', removed);
    }
    setShowUnsavedDialog(false);
    setTabToClose(null);
  };

  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
    setTabToClose(null);
  };

  // Allow horizontal scrolling with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };


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
        const response = await fetch(`http://${host}:${port}/api/v1/file-explorer/rename-file`, {
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
          
          // Update tab in store using the hook
          const { updateTab } = useTabStore.getState();
          updateTab(currentTab.id, updatedTab);
          
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
        const response = await fetch(`http://${host}:${port}/api/v1/file-explorer/delete-file`, {
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
            {isClient && (
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleRename(tab.id)}>Rename</ContextMenuItem>
                <ContextMenuItem onClick={() => handleDelete(tab.id)}>Delete</ContextMenuItem>
              </ContextMenuContent>
            )}
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
              <Button 
                variant="outline"
                onClick={() => setIsRenaming(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitRename}
              >
                Rename
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        fileName={tabToClose ? getTab(tabToClose)?.name || 'Unknown file' : ''}
        onClose={handleCancelClose}
        onSave={handleSaveAndClose}
        onConfirm={handleCloseAnyway}
      />
    </>
  );
};

export default FileTabsStore;
