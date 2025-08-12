/**
 * New File Explorer Component
 * Production-ready, efficient file explorer with real-time sync
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ChevronRightIcon, 
  ChevronDownIcon,
  FolderIcon,
  DocumentIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { FileNode, SearchFilters } from './types';
import { useFileExplorerStore } from './store/fileExplorerStore';
import { fileExplorerApi } from './services/api';
import { FileTreeNode } from './components/FileTreeNode';
import { SearchBar } from './components/SearchBar';
import { UploadDialog } from './components/UploadDialog';
import { CreateDialog } from './components/CreateDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { RenameDialog } from './components/RenameDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const handleFileOpen = useCallback((path: string) => {
    onFileOpen?.(path);
  }, [onFileOpen]);

  // Handle context menu actions
  const handleContextAction = useCallback((action: string, node: FileNode) => {
    
    switch (action) {
      case 'create_file':
        setShowCreateDialog({ type: 'file', parentPath: node.is_dir ? node.path : node.path.substring(0, node.path.lastIndexOf('/')) });
        break;
      case 'create_directory':
        setShowCreateDialog({ type: 'directory', parentPath: node.is_dir ? node.path : node.path.substring(0, node.path.lastIndexOf('/')) });
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
        const targetPath = activePath || rootPath;
        setShowUploadDialog({
          targetPath: node.is_dir ? node.path : node.path.substring(0, node.path.lastIndexOf('/'))
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
  }, [activePath, rootPath, cutItems, copyItems]);

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
      await navigator.clipboard.writeText(node.path);
      console.log(`✅ Path copied to clipboard: ${node.path}`);
      // You could add a toast notification here if available
    } catch (error) {
      console.error('Failed to copy path to clipboard:', error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = node.path;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log(`✅ Path copied to clipboard (fallback): ${node.path}`);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
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
              onDoubleClick={() => handleFileOpen(result.path)}
            >
              {result.is_dir ? (
                <FolderIcon className="w-4 h-4 mr-2 text-blue-500" />
              ) : (
                <DocumentIcon className="w-4 h-4 mr-2 text-gray-500" />
              )}
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
        <div className="text-center py-8 text-gray-500">
          <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2" />
          <div>No files found</div>
        </div>
      );
    }

    if (!fileTree) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FolderIcon className="w-8 h-8 mx-auto mb-2" />
          <div>No files to display</div>
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
      className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          File Explorer
        </h2>
        
        <div className="flex items-center space-x-1">
          {/* WebSocket status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            wsStatus === 'connected' ? 'bg-green-500' : 
            wsStatus === 'connecting' ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} title={`WebSocket: ${wsStatus}`} />
          
          {/* Refresh button */}
          <button
            onClick={() => refreshFileTree(true)} // Force refresh
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Upload button */}
          <button
            onClick={() => {
              const targetPath = activePath || rootPath;
              setShowUploadDialog({ targetPath });
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Upload files"
          >
            <CloudArrowUpIcon className="w-4 h-4" />
          </button>
          
          {/* Create menu */}
          <button
            onClick={() => setShowCreateDialog({ type: 'file', parentPath: activePath || rootPath })}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Create file"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          
          {/* Delete selected */}
          {/* {selectedPaths.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
              title={`Delete ${selectedPaths.length} selected item${selectedPaths.length !== 1 ? 's' : ''}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )} */}
        </div>
      </div>

      {/* Search bar */}
      <SearchBar
        onSearch={handleSearch}
        isSearching={isSearching}
        className="border-b border-gray-200 dark:border-gray-700"
      />

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* File tree content */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading && !fileTree ? (
          <div className="text-center py-8 text-gray-500">
            <ArrowPathIcon className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <div>Loading files...</div>
          </div>
        ) : (
          renderContent()
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
