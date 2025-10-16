/**
 * New File Explorer Component
 * Production-ready, efficient file explorer with real-time sync
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  RefreshCw, 
  FilePlus, 
  FolderPlus, 
  Upload,
  Search,
  Trash2,
  MoreHorizontal,
  Wifi,
  WifiOff,
  Loader2,
  Settings,
  X,
  Folder
} from 'lucide-react';
import { toast } from 'sonner';
import { FileIconComponent } from './utils/fileIcons';
import { FileNode, SearchFilters } from './types';
import { useFileExplorerStore } from './store/fileExplorerStore';
import { fileExplorerApi } from './services/api';
import { useTabStore } from '@/components/FileTabs/useTabStore';
import { FileTreeNode } from './components/FileTreeNode';
import { SearchBar } from './components/SearchBar';
import { UploadDialog } from './components/UploadDialog';
import { CreateDialog } from './components/CreateDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { RenameDialog } from './components/RenameDialog';
import { WorkspaceFoldersManager } from './components/WorkspaceFoldersManager';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface FileExplorerNewProps {
  className?: string;
  onFileSelect?: (path: string) => void;
  onFileOpen?: (path: string) => void;
}

export const FileExplorer_New: React.FC<FileExplorerNewProps> = ({
  className = '',
  onFileSelect,
  onFileOpen
}) => {
  // Store state
  const {
    fileTree,
    isLoading,
    error,
    searchQuery,
    searchResults,
    isSearching,
    selectedPaths,
    wsStatus,
    rootPath,
    activePath,
    // Actions
    refreshFileTree,
    searchFiles,
    clearSearch,
    connectWebSocket,
    disconnectWebSocket,
    selectNode,
    createFile,
    createDirectory,
    deleteItems,
    renameItem,
    duplicateItem,
    uploadFiles,
    downloadFile,
    clearError,
    setRootPath,
    // Clipboard operations
    cutItems,
    copyItems,
    pasteItems,
    canPaste
  } = useFileExplorerStore();

  // Local state for dialogs
  
  const [showCreateDialog, setShowCreateDialog] = useState<{
    type: 'file' | 'directory';
    parentPath: string;
  } | null>(null);
  
  const [showUploadDialog, setShowUploadDialog] = useState<{
    targetPath: string;
  } | null>(null);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState<{
    paths: string[];
    names: string[];
  } | null>(null);
  
  const [showRenameDialog, setShowRenameDialog] = useState<{
    path: string;
    currentName: string;
  } | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to get the parent directory path
  // If a file is selected, returns its parent directory
  // If a directory is selected, returns that directory
  // If nothing is selected, returns root path
  const getTargetDirectoryPath = useCallback((path?: string): string => {
    if (!path) return rootPath;
    
    // Check if the path is a file by looking at the fileTree
    const findNode = (node: FileNode | null, targetPath: string): FileNode | null => {
      if (!node) return null;
      if (node.path === targetPath) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, targetPath);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNode(fileTree, path);
    
    // If it's a file, return its parent directory
    if (node && !node.is_dir) {
      const lastSlashIndex = path.lastIndexOf('/');
      return lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : rootPath;
    }
    
    // If it's a directory or node not found, return the path itself
    return path;
  }, [fileTree, rootPath]);

  // Initialize component
  useEffect(() => {
    // Load initial file tree with force refresh
    refreshFileTree(true);
    
    // Connect WebSocket for real-time updates
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      disconnectWebSocket();
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle file selection
  const handleFileSelect = useCallback((path: string, multiSelect = false) => {
    selectNode(path, multiSelect);
    onFileSelect?.(path);
  }, [selectNode, onFileSelect]);

  // Handle file double-click (open)
  const handleFileOpen = useCallback(async (path: string) => {
    // Call the optional callback first
    onFileOpen?.(path);
    
    // Open file in tab (similar to old FileExplorer implementation)
    await openFileInTab(path);
  }, [onFileOpen]);

  // Function to open a file in a tab (inspired by old FileExplorer)
  const openFileInTab = useCallback(async (filePath: string) => {
    try {
      // Get all existing tabs
      const tabs = useTabStore.getState().getAllTabs();
      
      // Check if file is already open in a tab
      const existingTab = tabs.find(tab => tab.path === filePath);
      
      if (existingTab) {
        // If tab already exists, just activate it
        useTabStore.getState().activateTab(existingTab.id);
        console.log(`✅ Activated existing tab for: ${filePath}`);
      } else {
        // Extract file name from path
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        
        // Add the file to tabs with empty content initially
        // Content will be loaded in the EditorWindow component
        const tabId = useTabStore.getState().addTab(filePath, fileName, '');
        console.log(`✅ Opened new tab for: ${filePath}`);
        
        // Activate the newly created tab
        if (tabId) {
          useTabStore.getState().activateTab(tabId);
        }
      }
    } catch (error) {
      console.error('Error opening file in tab:', error);
      // You could add a toast notification here if available
      alert(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  // Function to force open a file in the code editor (for preview action)
  const openFileInEditor = useCallback(async (filePath: string) => {
    try {
      // Get all existing tabs
      const tabs = useTabStore.getState().getAllTabs();
      
      // Extract file name from path
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
      
      // Create a special filename that signals to EditorFactory to use code editor
      const previewFileName = `${fileName} (Text Preview)`;
      
      // Check if a preview tab for this file already exists
      const existingPreviewTab = tabs.find(tab => 
        tab.path === filePath && tab.name.includes('(Text Preview)')
      );
      
      if (existingPreviewTab) {
        // If preview tab already exists, just activate it
        useTabStore.getState().activateTab(existingPreviewTab.id);
        console.log(`✅ Activated existing preview tab: ${filePath}`);
      } else {
        // Always create a new preview tab, even if the regular file is already open
        // This allows users to have both the regular view and text preview open simultaneously
        const tabId = useTabStore.getState().addTab(filePath, previewFileName, '');
        console.log(`✅ Opened new preview tab in code editor: ${filePath}`);
        
        // Activate the newly created tab
        if (tabId) {
          useTabStore.getState().activateTab(tabId);
          
          // Update the tab to mark it as a preview tab
          useTabStore.getState().updateTab(tabId, {
            name: previewFileName,
            // Force text extension to ensure code editor
            extension: 'txt'
          });
        }
      }
    } catch (error) {
      console.error('Error opening file in code editor:', error);
      alert(`Failed to open file in editor: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  // Handle context menu actions
  const handleContextAction = useCallback(async (action: string, node: FileNode) => {
    
    switch (action) {
      case 'open':
        // Handle file open from context menu
        if (!node.is_dir) {
          handleFileOpen(node.path);
        }
        break;
      case 'preview':
        // Handle file preview in editor (force open in code editor instead of specialized viewers)
        if (!node.is_dir) {
          await openFileInEditor(node.path);
        }
        break;
      case 'create_file':
        setShowCreateDialog({ type: 'file', parentPath: getTargetDirectoryPath(node.path) });
        break;
      case 'create_directory':
        setShowCreateDialog({ type: 'directory', parentPath: getTargetDirectoryPath(node.path) });
        break;
      case 'rename':
        setShowRenameDialog({
          path: node.path,
          currentName: node.name
        });
        break;
      case 'delete':
        setShowDeleteDialog({
          paths: [node.path],
          names: [node.name]
        });
        break;
      case 'upload':
        setShowUploadDialog({
          targetPath: getTargetDirectoryPath(node.path)
        });
        break;
      case 'duplicate':
        handleDuplicate(node);
        break;
      case 'download':
        handleDownload(node);
        break;
      case 'cut':
        cutItems([node.path]);
        break;
      case 'copy':
        copyItems([node.path]);
        break;
      case 'paste':
        handlePaste(node);
        break;
      case 'copy_path':
        handleCopyPath(node);
        break;
    }
  }, [getTargetDirectoryPath, cutItems, copyItems, handleFileOpen, openFileInEditor]);

  // Handle download
  const handleDownload = useCallback(async (node: FileNode) => {
    if (node.is_dir) {
      console.warn('Cannot download directory directly');
      return;
    }
    
    try {
      await downloadFile(node.path);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [downloadFile]);

  // Handle paste
  const handlePaste = useCallback(async (node: FileNode) => {
    const targetPath = node.is_dir ? node.path : node.path.substring(0, node.path.lastIndexOf('/'));
    
    try {
      await pasteItems(targetPath);
    } catch (error) {
      console.error('Paste failed:', error);
    }
  }, [pasteItems]);

  // Handle copy path
  const handleCopyPath = useCallback(async (node: FileNode) => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      // Try modern clipboard API first
      await navigator.clipboard.writeText(node.path);
      console.log(`✅ Path copied to clipboard: ${node.path}`);
      toast.success(`Path copied: ${node.path}`, {
        description: 'Path has been copied to clipboard',
        duration: 2000,
      });
    } catch (error) {
      console.error('Clipboard API failed:', error);
      
      // Fallback method for macOS and older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = node.path;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', '');
        
        document.body.appendChild(textArea);
        
        // Focus and select for macOS
        textArea.focus();
        textArea.select();
        
        // For iOS/macOS - set selection range
        textArea.setSelectionRange(0, textArea.value.length);
        
        // Try execCommand
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          console.log(`✅ Path copied to clipboard (fallback): ${node.path}`);
          toast.success(`Path copied: ${node.path}`, {
            description: 'Path has been copied to clipboard',
            duration: 2000,
          });
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
        
        // Final fallback - show path in a prompt for manual copy
        const userAgent = navigator.userAgent.toLowerCase();
        const isMac = userAgent.includes('mac');
        const copyKey = isMac ? 'Cmd+C' : 'Ctrl+C';
        
        toast.error('Copy Path', {
          description: `Please copy manually: ${node.path}`,
          duration: 5000,
        });
        
        // Show alert with path for manual copy
        alert(`Copy this path:\n\n${node.path}\n\nPress ${copyKey} to copy`);
      }
    }
  }, []);

  // Handle duplicate
  const handleDuplicate = useCallback(async (node: FileNode) => {
    try {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const fileName = node.name;
      const fileExtension = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
      const baseName = fileExtension ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
      
      // Generate a unique name for the duplicate
      let duplicateName = `${baseName}_copy${fileExtension}`;
      let counter = 1;
      
      // Check if the duplicate name already exists and increment counter if needed
      while (await fileExplorerApi.fileExists(`${parentPath}/${duplicateName}`)) {
        duplicateName = `${baseName}_copy${counter}${fileExtension}`;
        counter++;
      }
      
      const destinationPath = `${parentPath}/${duplicateName}`;
      await duplicateItem(node.path, destinationPath);
    } catch (error) {
      console.error('Duplicate failed:', error);
    }
  }, [duplicateItem]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    if (selectedPaths.length === 0) return;
    
    const paths = selectedPaths;
    const names = paths.map(path => path.substring(path.lastIndexOf('/') + 1));
    
    setShowDeleteDialog({ paths, names });
  }, [selectedPaths]);

  // Handle search
  const handleSearch = useCallback((query: string, filters?: SearchFilters) => {
    if (query.trim()) {
      searchFiles(query);
    } else {
      clearSearch();
    }
  }, [searchFiles, clearSearch]);

  // Handle file upload via drag & drop or file input
  const handleFileUpload = useCallback(async (files: File[], targetPath: string) => {
    try {
      await uploadFiles(files, targetPath);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [uploadFiles]);

  // Handle drag & drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files, activePath || rootPath);
    }
  }, [handleFileUpload, activePath, selectedPaths]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Render search results or file tree
  const renderContent = () => {
    if (searchQuery && searchResults.length > 0) {
      return (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-2 py-1">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
          </div>
          {searchResults.map((result, index) => (
            <div
              key={`${result.path}-${index}`}
              className="flex items-center px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded text-sm"
              onClick={() => handleFileSelect(result.path)}
              onDoubleClick={() => {
                // Only open files, not directories
                if (!result.is_dir) {
                  handleFileOpen(result.path);
                }
              }}
            >
              <FileIconComponent 
                fileName={result.name} 
                isDirectory={result.is_dir} 
                size={16} 
                className={`mr-2 ${result.is_dir ? 'text-blue-500' : 'text-gray-500'}`} 
              />
              <div className="flex-1 min-w-0">
                <div className="truncate">{result.name}</div>
                <div className="text-xs text-gray-500 truncate">{result.path}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (searchQuery && searchResults.length === 0 && !isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mb-3" />
          <p className="text-sm font-medium">No files found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search filters</p>
        </div>
      );
    }

    if (!fileTree) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Folder className="w-8 h-8 mb-3" />
          <p className="text-sm font-medium">No files to display</p>
          <p className="text-xs text-muted-foreground/70 mt-1">The directory appears to be empty</p>
        </div>
      );
    }

    return (
      <FileTreeNode
        node={fileTree}
        onSelect={handleFileSelect}
        onOpen={handleFileOpen}
        onContextAction={handleContextAction}
        selectedPaths={new Set(selectedPaths)}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className={cn("flex flex-col h-screen bg-white dark:bg-gray-800", className)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Modern Header with Shadcn Components */}
      <TooltipProvider>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold tracking-tight text-foreground/80">
              FILES
            </h2>
            
            {/* WebSocket status indicator */}
            {/* <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
              wsStatus === 'connected' 
                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                : wsStatus === 'connecting'
                ? "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800"
                : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
            )}>
              {wsStatus === 'connected' ? (
                <><div className="w-2 h-2 bg-green-500 rounded-full" />Online</>
              ) : wsStatus === 'connecting' ? (
                <><Loader2 className="h-3 w-3 animate-spin" />Connecting</>
              ) : (
                <><div className="w-2 h-2 bg-red-500 rounded-full" />Offline</>
              )}
            </div> */}
          </div>
          
          <div className="flex items-center gap-0.5">
            {/* Primary action buttons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshFileTree(true)}
                  disabled={isLoading}
                  className="h-7 w-7 p-0 hover:bg-accent"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Refresh</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateDialog({ 
                    type: 'file', 
                    parentPath: getTargetDirectoryPath(activePath || rootPath)
                  })}
                  className="h-7 w-7 p-0 hover:bg-accent"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">New file</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateDialog({ 
                    type: 'directory', 
                    parentPath: getTargetDirectoryPath(activePath || rootPath)
                  })}
                  className="h-7 w-7 p-0 hover:bg-accent"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">New folder</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const targetPath = getTargetDirectoryPath(activePath || rootPath);
                    setShowUploadDialog({ targetPath });
                  }}
                  className="h-7 w-7 p-0 hover:bg-accent"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Upload</p>
              </TooltipContent>
            </Tooltip>
            
            <Separator orientation="vertical" className="h-5 mx-0.5" />
            
            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 hover:bg-accent"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedPaths.length > 0) {
                      const names = selectedPaths.map(path => path.split('/').pop() || path);
                      setShowDeleteDialog({ paths: selectedPaths, names });
                    }
                  }}
                  disabled={selectedPaths.length === 0}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete selected ({selectedPaths.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TooltipProvider>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-border/50">
        <SearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          className=""
        />
      </div>

      {/* Workspace Folders Manager */}
      <WorkspaceFoldersManager 
        onFoldersChange={() => refreshFileTree(true)}
        onFolderSelect={(folderPath) => {
          console.log('🔄 Switching root path to:', folderPath);
          setRootPath(folderPath);
          refreshFileTree(true);
        }}
      />

      {/* Error display */}
      {error && (
        <div className="p-3 border-b">
          <Alert variant="destructive" className="relative">
            <AlertDescription className="pr-8">
              {error}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-destructive/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}

      {/* File tree content */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading && !fileTree ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 mb-3 animate-spin" />
            <p className="text-sm font-medium">Loading files...</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Please wait while we fetch your files</p>
          </div>
        ) : (
          <div className="p-2 pb-16 space-y-1">
            {renderContent()}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateDialog
        open={!!showCreateDialog}
        type={showCreateDialog?.type || 'file'}
        parentPath={showCreateDialog?.parentPath || ''}
        onConfirm={async (name) => {
          if (showCreateDialog) {
            if (showCreateDialog.type === 'file') {
              await createFile(name, showCreateDialog.parentPath);
            } else {
              await createDirectory(name, showCreateDialog.parentPath);
            }
            setShowCreateDialog(null);
          }
        }}
        onCancel={() => setShowCreateDialog(null)}
      />

      <UploadDialog
        open={!!showUploadDialog}
        targetPath={showUploadDialog?.targetPath || ''}
        onUpload={(files) => {
          if (showUploadDialog) {
            handleFileUpload(files, showUploadDialog.targetPath);
            setShowUploadDialog(null);
          }
        }}
        onCancel={() => setShowUploadDialog(null)}
      />

      <DeleteConfirmDialog
        open={!!showDeleteDialog}
        paths={showDeleteDialog?.paths || []}
        names={showDeleteDialog?.names || []}
        onConfirm={async () => {
          if (showDeleteDialog) {
            await deleteItems(showDeleteDialog.paths);
            setShowDeleteDialog(null);
          }
        }}
        onCancel={() => setShowDeleteDialog(null)}
      />

      <RenameDialog
        open={!!showRenameDialog}
        currentName={showRenameDialog?.currentName || ''}
        onConfirm={async (newName) => {
          if (showRenameDialog) {
            await renameItem(showRenameDialog.path, newName);
            setShowRenameDialog(null);
          }
        }}
        onCancel={() => setShowRenameDialog(null)}
      />

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFileUpload(files, activePath || rootPath);
          }
          e.target.value = ''; // Reset input
        }}
      />
    </div>
  );
};

export default FileExplorer_New;
