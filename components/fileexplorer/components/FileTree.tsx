"use client";

import React, { Fragment, useState, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Loader2, Check, Copy, Trash } from 'lucide-react';
import { useFileExplorerStore } from '../store';
import { useFileTabsStore } from '@/store/fileTabsStore';
import type { FileNode } from '../types';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '../utils/clipboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileTreeProps {
  node: FileNode;
  level?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({ node, level = 0 }) => {
  const { 
    isNodeExpanded, 
    toggleNode, 
    navigateToPath, 
    fetchDirectoryContents,
    isNodeLoaded,
    createFile,
    createFolder,
    deleteItem
  } = useFileExplorerStore();
  const { addTab } = useFileTabsStore();
  const isOpen = isNodeExpanded(node.path);
  const isLoaded = node.isLoaded || isNodeLoaded(node.path);
  const isLoading = node.isLoading || false;
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Dialog states for file/folder creation and deletion
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle copying path to clipboard
  const handleCopyPath = useCallback(async () => {
    const success = await copyToClipboard(node.path);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  }, [node.path]);
  
  // Handle file creation
  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      setError('File name cannot be empty');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('Creating file in directory:', node.path);
      await createFile(node.path, newFileName);
      
      // Close dialog and reset form
      setIsNewFileDialogOpen(false);
      setNewFileName('');
      
      // Show success toast
      toast.success("File created", {
        position: "top-right",
        description: `${newFileName} has been created successfully`,
        action: {
          label: "Open",
          onClick: () => addTab({ name: newFileName, path: `${node.path}/${newFileName}` })
        }
      });
    } catch (err) {
      console.error('Error creating file:', err);
      
      // Keep the dialog open and show the error
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      
      // Extract the specific error message if it's a "File already exists" error
      const fileExistsMatch = errorMessage.match(/File already exists: (.*)/i);
      const displayMessage = fileExistsMatch ? 
        `File "${newFileName}" already exists in this location` : 
        errorMessage;
      
      // Show error toast with custom styling
      toast.error("Failed to create file", {
        description: displayMessage,
       
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Folder name cannot be empty');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('Creating folder in directory:', node.path);
      await createFolder(node.path, newFolderName);
      
      // Close dialog and reset form
      setIsNewFolderDialogOpen(false);
      setNewFolderName('');
      
      // Show success toast
      toast.success("Folder created", {
        position: "top-right",
        description: `${newFolderName} has been created successfully`,
      });
    } catch (err) {
      console.error('Error creating folder:', err);
      
      // Keep the dialog open and show the error
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      
      // Extract the specific error message if it's a "Folder already exists" error
      const folderExistsMatch = errorMessage.match(/Folder already exists: (.*)/i);
      const displayMessage = folderExistsMatch ? 
        `Folder "${newFolderName}" already exists in this location` : 
        errorMessage;
      
      // Show error toast with custom styling
      toast.error("Failed to create folder", {
        position: "top-right",
        description: displayMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle item deletion
  const handleDeleteItem = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      console.log('Deleting item:', node.path);
      await deleteItem(node.path);
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      
      // Show success toast
      toast.success(
        node.type === 'directory' ? "Folder deleted" : "File deleted", 
        {
          position: "top-right",
          description: `${node.name} has been deleted successfully`,
        }
      );
    } catch (err) {
      console.error('Error deleting item:', err);
      
      // Keep the dialog open and show the error
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      
      // Show error toast with custom styling
      toast.error(
        node.type === 'directory' ? "Failed to delete folder" : "Failed to delete file", 
        {
          position: "top-right",
          description: errorMessage,
         
        }
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const containerStyle = level === 0 ? {
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#9CA3AF transparent'
  } as React.CSSProperties : {};

  return (
    <div className="relative" style={{ ...containerStyle, paddingLeft: level ? '20px' : '0px' }}>
      {level > 0 && (
        <Fragment>
          <div 
            className="absolute left-0 top-0 bottom-0 border-l border-dotted border-gray-300" 
            style={{ left: '10px', height: node.children && isOpen ? '100%' : '16px' }}
          />
          <div 
            className="absolute border-t border-dotted border-gray-300" 
            style={{ left: '10px', top: '8px', width: '10px' }}
          />
        </Fragment>
      )}
      
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'flex items-center py-0.5 px-1 hover:bg-gray-100 rounded cursor-pointer group',
              'text-sm text-gray-700',
              isOpen && node.type === 'directory' ? 'bg-gray-50' : ''
            )}
            onClick={() => {
              if (node.type === 'directory') {
                // The toggleNode action now handles watching directories and fetching contents
                // It will automatically fetch contents if needed and manage watched directories
                toggleNode(node.path);
              } else {
                // For files, open the file in the editor
                addTab({ name: node.name, path: node.path });
              }
            }}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              {node.type === 'directory' ? (
                isOpen ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )
              ) : (
                <div className="w-3" /> 
              )}
            </div>
            <div className="w-4 h-4 flex items-center justify-center mr-1">
              {node.type === 'directory' ? (
                isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-gray-400" />
                )
              ) : (
                <File className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            <span className="truncate">{node.name}</span>
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="ml-1">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              </div>
            )}
            
            {/* Copy path button (only visible on hover) */}
            <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center">
              <button 
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPath();
                }}
                title="Copy path"
              >
                {copySuccess ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent className="w-48">
          {node.type === 'directory' && (
            <>
              <ContextMenuItem onClick={() => setIsNewFileDialogOpen(true)}>
                <File className="w-3.5 h-3.5 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                <Folder className="w-3.5 h-3.5 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash className="w-3.5 h-3.5 mr-2" />
                Delete Folder
              </ContextMenuItem>
            </>
          )}
          {node.type === 'file' && (
            <ContextMenuItem 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash className="w-3.5 h-3.5 mr-2" />
              Delete File
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={handleCopyPath}>
            <Copy className="w-3.5 h-3.5 mr-2" />
            Copy Path
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Render children if directory is open */}
      {node.type === 'directory' && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTree key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
      
      {/* New File Dialog */}
      <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="name"
                placeholder="filename.txt"
                className="col-span-4"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <p className="text-xs text-gray-500">Creating file in: {node.path}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewFileDialogOpen(false);
                setNewFileName('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="name"
                placeholder="folder-name"
                className="col-span-4"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <p className="text-xs text-gray-500">Creating folder in: {node.path}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewFolderDialogOpen(false);
                setNewFolderName('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Delete {node.type === 'directory' ? 'Folder' : 'File'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium">{node.name}</span>?
              {node.type === 'directory' && (
                <span className="block mt-1 text-red-500">
                  This will delete all files and subfolders inside this folder.
                </span>
              )}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteItem} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
