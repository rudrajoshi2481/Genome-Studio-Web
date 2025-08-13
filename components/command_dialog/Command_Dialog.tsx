"use client";

import React, { useEffect, useState, useCallback } from "react";
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

/**
 * Refreshes the current window
 */
const refreshWindow = () => {
  window.location.reload();
};

export const CommandDialogComponent = () => {
  const [open, setOpen] = useState(false);
  
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
    refreshFileTree,
    searchFiles,
    clearSearch,
    createFile,
    createDirectory,
    uploadFiles,
    connectWebSocket,
    disconnectWebSocket
  } = useFileExplorerStore();

  useEffect(() => {
    // Add event listener for Ctrl+Shift+P (VS Code style)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+P (or Cmd+Shift+P on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault(); // Prevent default browser behavior
        setOpen((open) => !open);
      }
      // Also support Ctrl+P for quick access
      else if ((e.ctrlKey || e.metaKey) && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    // Trigger new file creation in current directory
    const fileName = prompt('Enter file name:');
    if (fileName) {
      createFile(fileName);
    }
  }, [createFile]);

  const handleNewFolder = useCallback(() => {
    setOpen(false);
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      createDirectory(folderName);
    }
  }, [createDirectory]);

  const handleSearchFiles = useCallback(() => {
    setOpen(false);
    const query = prompt('Search files:');
    if (query) {
      searchFiles(query);
    }
  }, [searchFiles]);

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
    }
  }, [getActiveTab]);

  const handleToggleTerminal = useCallback(() => {
    setOpen(false);
    // This would need to be implemented based on your terminal component
    console.log('Toggle terminal');
  }, []);

  const handleToggleFileExplorer = useCallback(() => {
    setOpen(false);
    // This would need to be implemented based on your sidebar toggle
    console.log('Toggle file explorer');
  }, []);

  // Get current tabs for quick access
  const tabs = getAllTabs();
  const activeTab = getActiveTab();

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search... (Ctrl+Shift+P)" />
        <CommandList>
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
            <CommandItem onSelect={handleToggleFileExplorer}>
              <FolderIcon className="mr-2 h-4 w-4" />
              Toggle File Explorer
              <CommandShortcut>Ctrl+Shift+E</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={handleToggleTerminal}>
              <TerminalIcon className="mr-2 h-4 w-4" />
              Toggle Terminal
              <CommandShortcut>Ctrl+`</CommandShortcut>
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
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default CommandDialogComponent;
