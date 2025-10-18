"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  RefreshCwIcon,
  FileIcon,
  FolderIcon,
  FilePlusIcon,
  FolderPlusIcon,
  SearchIcon,
  TerminalIcon,
  SettingsIcon,
  SaveIcon,
  CopyIcon,
  ScissorsIcon,
  UploadIcon,
  DownloadIcon,
  EyeIcon,
  XIcon,
  MaximizeIcon,
  MinimizeIcon,
  SplitIcon,
  GitBranchIcon,
  BugIcon,
  PlayIcon,
  PauseIcon,
  ZoomInIcon,
  ZoomOutIcon,
  HomeIcon,
  BookOpenIcon,
  MessageSquareIcon,
  MonitorIcon
} from "lucide-react";
import { useTabStore } from '@/components/FileTabs/useTabStore';
import { useFileExplorerStore } from '@/components/Sidebar/FileExplorer_New/store/fileExplorerStore';
import { useTerminalStore } from '@/components/Terminal/store/terminal-store';
import { CreateDialog } from '@/components/Sidebar/FileExplorer_New/components/CreateDialog';
import { UploadDialog } from '@/components/Sidebar/FileExplorer_New/components/UploadDialog';
import { toast } from 'sonner';

/**
 * Refreshes the current window
 */
const refreshWindow = () => {
  window.location.reload();
};

export const CommandDialogComponent = () => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'file' | 'command'>('command'); // 'file' mode without '>', 'command' mode with '>
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState<{
    type: 'file' | 'directory';
    parentPath: string;
  } | null>(null);
  
  const [showUploadDialog, setShowUploadDialog] = useState<{
    targetPath: string;
  } | null>(null);
  
  // Store hooks
  const { 
    getAllTabs, 
    getActiveTab, 
    activateTab, 
    closeTab, 
    addTab,
    closeAllTabs,
    saveTab
  } = useTabStore();
  
  const {
    rootPath,
    activePath,
    fileTree,
    searchResults,
    isSearching,
    refreshFileTree,
    searchFiles,
    clearSearch,
    createFile,
    createDirectory,
    uploadFiles,
    connectWebSocket,
    disconnectWebSocket
  } = useFileExplorerStore();

  const { createTab: createTerminalTab } = useTerminalStore();
  const { addTab: addFileTab } = useTabStore();

  useEffect(() => {
    // Add event listener for Ctrl+Shift+P (VS Code style)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+P (or Cmd+Shift+P on Mac) - Command mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setMode('command');
        setSearchQuery('>');
        setOpen(true);
      }
      // Ctrl+P for file search mode
      else if ((e.ctrlKey || e.metaKey) && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        setMode('file');
        setSearchQuery('');
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle search query changes and mode detection with debouncing
  useEffect(() => {
    if (searchQuery.startsWith('>')) {
      setMode('command');
      return;
    }
    
    setMode('file');
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce file search (300ms delay)
    if (searchQuery.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedQuery(searchQuery);
        searchFiles(searchQuery);
      }, 300);
    } else {
      setDebouncedQuery('');
      clearSearch();
    }
    
    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, searchFiles, clearSearch]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setDebouncedQuery('');
      clearSearch();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  }, [open, clearSearch]);

  // Command handlers
  const handleRefresh = useCallback(() => {
    setOpen(false);
    setTimeout(refreshWindow, 100);
  }, []);

  const handleRefreshFileTree = useCallback(() => {
    setOpen(false);
    refreshFileTree(true);
  }, [refreshFileTree]);

  const handleNewFile = useCallback(() => {
    setOpen(false);
    // Open create file dialog with current active path or root
    const targetPath = activePath || rootPath;
    setShowCreateDialog({ type: 'file', parentPath: targetPath });
  }, [activePath, rootPath]);

  const handleNewFolder = useCallback(() => {
    setOpen(false);
    // Open create folder dialog with current active path or root
    const targetPath = activePath || rootPath;
    setShowCreateDialog({ type: 'directory', parentPath: targetPath });
  }, [activePath, rootPath]);

  const handleUploadFiles = useCallback(() => {
    setOpen(false);
    // Open upload dialog with current active path or root
    const targetPath = activePath || rootPath;
    setShowUploadDialog({ targetPath });
  }, [activePath, rootPath]);

  const handleSearchFiles = useCallback(() => {
    setOpen(false);
    // Focus on file explorer search input
    setTimeout(() => {
      const searchInput = document.querySelector('[placeholder="Search files and folders..."]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      } else {
        toast.info('Open File Explorer to use search');
      }
    }, 100);
  }, []);

  // Handle file selection from search results
  const handleFileSelect = useCallback((filePath: string) => {
    setOpen(false);
    // Open the file in a new tab
    const fileName = filePath.split('/').pop() || 'file';
    addFileTab(filePath, fileName, '');
    toast.success(`Opened ${fileName}`);
  }, [addFileTab]);

  // Handle create dialog confirm
  const handleCreateConfirm = useCallback(async (name: string) => {
    if (!showCreateDialog) return;
    
    try {
      if (showCreateDialog.type === 'file') {
        await createFile(name, showCreateDialog.parentPath);
        toast.success(`File "${name}" created successfully`);
      } else {
        await createDirectory(name, showCreateDialog.parentPath);
        toast.success(`Folder "${name}" created successfully`);
      }
    } catch (error) {
      toast.error(`Failed to create ${showCreateDialog.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setShowCreateDialog(null);
    }
  }, [showCreateDialog, createFile, createDirectory]);

  // Handle upload dialog confirm
  const handleUploadConfirm = useCallback(async (files: File[]) => {
    if (!showUploadDialog) return;
    
    try {
      await uploadFiles(files, showUploadDialog.targetPath);
      toast.success(`Uploaded ${files.length} file(s) successfully`);
    } catch (error) {
      toast.error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setShowUploadDialog(null);
    }
  }, [showUploadDialog, uploadFiles]);

  const handleSaveCurrentTab = useCallback(() => {
    setOpen(false);
    const activeTab = getActiveTab();
    if (activeTab) {
      saveTab(activeTab.id);
    }
  }, [getActiveTab, saveTab]);

  const handleCloseCurrentTab = useCallback(() => {
    setOpen(false);
    const activeTab = getActiveTab();
    if (activeTab) {
      closeTab(activeTab.id);
    }
  }, [getActiveTab, closeTab]);

  const handleCloseAllTabs = useCallback(() => {
    setOpen(false);
    closeAllTabs();
  }, [closeAllTabs]);

  const handleGoToTab = useCallback((tabId: string) => {
    setOpen(false);
    activateTab(tabId);
  }, [activateTab]);

  const handleCopyPath = useCallback(() => {
    setOpen(false);
    const activeTab = getActiveTab();
    if (activeTab && activeTab.path) {
      navigator.clipboard.writeText(activeTab.path);
      toast.success('File path copied to clipboard');
    } else {
      toast.error('No active file to copy path from');
    }
  }, [getActiveTab]);

  const handleCreateTerminal = useCallback(() => {
    setOpen(false);
    // Create a new simple bash terminal tab
    const terminalId = createTerminalTab(`Terminal ${Date.now()}`, 'simple');
    toast.success('New bash terminal created');
    
    // Optional: Navigate to terminal view if needed
    // You might want to add logic here to switch to terminal view
  }, [createTerminalTab]);


  // Get current tabs for quick access
  const tabs = getAllTabs();
  const activeTab = getActiveTab();

  // Get display query (remove '>' for command mode)
  const displayQuery = mode === 'command' && searchQuery.startsWith('>') 
    ? searchQuery.slice(1).trim() 
    : searchQuery;

  return (
    <>
      {/* Command Palette Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={mode === 'command'} filter={(value, search) => {
          // In command mode, filter by the query without '>'
          if (mode === 'command') {
            const cleanSearch = search.startsWith('>') ? search.slice(1).trim() : search;
            if (!cleanSearch) return 1; // Show all commands if no search query
            if (value.toLowerCase().includes(cleanSearch.toLowerCase())) return 1;
            return 0;
          }
          return 1;
        }}>
          <CommandInput 
            placeholder={mode === 'file' ? 'Search files... (type > for commands)' : 'Type a command...'}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          {/* Progress bar under input when searching */}
          {mode === 'file' && isSearching && (
            <div className="relative h-0.5 w-full bg-muted overflow-hidden">
              <div className="absolute inset-0 bg-primary animate-progress" />
            </div>
          )}
          <CommandList>
            {mode === 'file' ? (
              // File Search Mode
              <>
                {searchQuery.trim() === '' && !isSearching ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <SearchIcon className="h-4 w-4 mx-auto mb-2" />
                    Start typing to search files...
                  </div>
                ) : searchResults.length === 0 && !isSearching ? (
                  <CommandEmpty>No files found.</CommandEmpty>
                ) : searchResults.length > 0 ? (
                  <CommandGroup heading={
                    <div className="flex items-center justify-between">
                      <span>Found {searchResults.length} file(s)</span>
                      {isSearching && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <RefreshCwIcon className="h-3 w-3 animate-spin" />
                          Updating...
                        </span>
                      )}
                    </div>
                  }>
                    {searchResults.slice(0, 50).map((file) => (
                      <CommandItem
                        key={file.path}
                        onSelect={() => handleFileSelect(file.path)}
                        className="flex items-start gap-3 py-3 px-2"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {file.is_dir ? (
                            <FolderIcon className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileIcon className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">{file.name}</span>
                            {file.size && !file.is_dir && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate block" title={file.path}>
                            {file.path}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            ) : (
              // Command Mode
              <>
                <CommandEmpty>No results found.</CommandEmpty>
            
            {/* File Operations */}
            <CommandGroup heading="File">
              <CommandItem onSelect={handleNewFile}>
                <FilePlusIcon className="mr-2 h-4 w-4" />
                New File
                <CommandShortcut>Ctrl+N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={handleNewFolder}>
                <FolderPlusIcon className="mr-2 h-4 w-4" />
                New Folder
                <CommandShortcut>Ctrl+Shift+N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={handleUploadFiles}>
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload Files
                <CommandShortcut>Ctrl+U</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={handleSaveCurrentTab}>
                <SaveIcon className="mr-2 h-4 w-4" />
                Save File
                <CommandShortcut>Ctrl+S</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={handleSearchFiles}>
                <SearchIcon className="mr-2 h-4 w-4" />
                Search Files
                <CommandShortcut>Ctrl+Shift+F</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          
          <CommandSeparator />
          
          {/* Editor Operations */}
          <CommandGroup heading="Editor">
            <CommandItem onSelect={handleCloseCurrentTab}>
              <XIcon className="mr-2 h-4 w-4" />
              Close Tab
              <CommandShortcut>Ctrl+W</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={handleCloseAllTabs}>
              <XIcon className="mr-2 h-4 w-4" />
              Close All Tabs
              <CommandShortcut>Ctrl+Shift+W</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={handleCopyPath}>
              <CopyIcon className="mr-2 h-4 w-4" />
              Copy File Path
              <CommandShortcut>Ctrl+Shift+C</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          {/* View Operations */}
          <CommandGroup heading="View">
            <CommandItem onSelect={handleCreateTerminal}>
              <TerminalIcon className="mr-2 h-4 w-4" />
              Create New Terminal
              <CommandShortcut>Ctrl+Shift+`</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={handleRefreshFileTree}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Refresh File Explorer
              <CommandShortcut>F5</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          {/* Developer Tools */}
          <CommandGroup heading="Developer">
            <CommandItem onSelect={handleRefresh}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Reload Window
              <CommandShortcut>Ctrl+R</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); console.log('Open DevTools'); }}>
              <BugIcon className="mr-2 h-4 w-4" />
              Toggle Developer Tools
              <CommandShortcut>F12</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          
          {/* Quick Tab Access */}
          {tabs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Open Tabs">
                {tabs.map((tab) => (
                  <CommandItem
                    key={tab.id}
                    onSelect={() => handleGoToTab(tab.id)}
                  >
                    <FileIcon className="mr-2 h-4 w-4" />
                    {tab.name}
                    {activeTab?.id === tab.id && (
                      <span className="ml-auto text-xs text-blue-500">Active</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          
          <CommandSeparator />
          
          {/* System Operations */}
          <CommandGroup heading="System">
            <CommandItem onSelect={() => { setOpen(false); connectWebSocket(); }}>
              <MonitorIcon className="mr-2 h-4 w-4" />
              Connect WebSocket
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); disconnectWebSocket(); }}>
              <MonitorIcon className="mr-2 h-4 w-4" />
              Disconnect WebSocket
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          {/* Help & Settings */}
          <CommandGroup heading="Help & Settings">
            <CommandItem onSelect={() => { setOpen(false); console.log('Open Settings'); }}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
              <CommandShortcut>Ctrl+,</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { setOpen(false); console.log('Open Help'); }}>
              <BookOpenIcon className="mr-2 h-4 w-4" />
              Help & Documentation
              <CommandShortcut>F1</CommandShortcut>
            </CommandItem>
          </CommandGroup>
              </>
            )}
        </CommandList>
      </Command>
    </CommandDialog>

    {/* File Explorer Dialogs */}
    {showCreateDialog && (
      <CreateDialog
        open={true}
        type={showCreateDialog.type}
        parentPath={showCreateDialog.parentPath}
        onConfirm={handleCreateConfirm}
        onCancel={() => setShowCreateDialog(null)}
      />
    )}

    {showUploadDialog && (
      <UploadDialog
        open={true}
        targetPath={showUploadDialog.targetPath}
        onUpload={handleUploadConfirm}
        onCancel={() => setShowUploadDialog(null)}
      />
    )}
    </>
  );
};

export default CommandDialogComponent;

// Add custom animation for progress bar
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes progress {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    .animate-progress {
      animation: progress 1.5s ease-in-out infinite;
    }
  `;
  if (!document.head.querySelector('style[data-progress-animation]')) {
    style.setAttribute('data-progress-animation', 'true');
    document.head.appendChild(style);
  }
}
