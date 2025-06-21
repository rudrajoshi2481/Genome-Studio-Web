import React, { useEffect, useState } from 'react'
import { useFileExplorerStore } from './utils/store'
import { FileNode } from './utils/FileExplorerClass'
import { FolderIcon, FileIcon, ChevronRightIcon, RefreshCwIcon, FilePlusIcon, FolderPlusIcon, ChevronsDownIcon } from 'lucide-react'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import FileService from '@/components/services/file-service'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import * as authService from '@/lib/services/auth-service'

const FileExplorer: React.FC = () => {
  // State for rename dialog
  const [isRenaming, setIsRenaming] = useState(false)
  const [nodeToRename, setNodeToRename] = useState<FileNode | null>(null)
  const [newFileName, setNewFileName] = useState('')
  
  // State for delete confirmation dialog
  const [isDeleting, setIsDeleting] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<FileNode | null>(null)
  
  // State for new file dialog
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
  const [newFileInput, setNewFileInput] = useState('')
  
  // State for new folder dialog
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false)
  const [newFolderInput, setNewFolderInput] = useState('')
  
  const {
    fileTree,
    isLoading,
    error,
    wsStatus,
    refreshFileTree,
    toggleNode,
    selectNode,
    isNodeExpanded,
    createNewFile,
    createNewFolder,
    collapseAll,
    setRootPath,
    rootPath,
    selectedPaths,
    activePath
  } = useFileExplorerStore()
  
  // Get tab store methods
  const { addTab, activateTab, getAllTabs } = useTabStore()

//   const [currentDirectory, setCurrentDirectory] = useState<string>('/app')

  // Initial fetch of the file tree
  useEffect(() => {
    // Set the default root path to /app
    setRootPath('/home')
    
    // Then refresh the file tree with the new path
    refreshFileTree()
    
    // Cleanup WebSocket connection when component unmounts
    return () => {
      useFileExplorerStore.getState().disconnectWebSocket()
    }
  }, [refreshFileTree, setRootPath])

  // Handle refresh button click
  const handleRefresh = () => {
    refreshFileTree()
  }
  
  // Function to open a file in a tab
  const openFileInTab = async (node: FileNode) => {
    // Get all existing tabs
    const tabs = getAllTabs()
    
    // Check if file is already open in a tab
    const existingTab = tabs.find(tab => tab.path === node.path)
    
    if (existingTab) {
      // If tab already exists, just activate it
      activateTab(existingTab.id)
    } else {
      try {
        // Add the file to tabs with empty content initially
        // Content will be loaded in the EditorWindow component
        addTab(node.path, node.name, '')
      } catch (error) {
        console.error('Error opening file:', error)
        // Show error in a user-friendly way
        alert(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  // Render a single file node
  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = isNodeExpanded(node.path)
    const isSelected = node.selected || false
    
    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (node.is_dir) {
        toggleNode(node.path)
      }
    }
    
    const handleSelect = async (e: React.MouseEvent) => {
      e.stopPropagation()
      
      // For directories, toggle expansion when clicked
      if (node.is_dir) {
        toggleNode(node.path)
      } else {
        // If it's a file, open it in a tab
        openFileInTab(node)
      }
      
      // Always select the node
      selectNode(node.path, e.ctrlKey || e.metaKey)
    }
    
    // Generate a unique key by combining path with the modified timestamp
    const nodeKey = `${node.path}-${node.modified || Date.now()}`
    
    return (
      <div key={nodeKey}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div 
              className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
              style={{ paddingLeft: `${(depth * 12) + 4}px` }}
              onClick={handleSelect}
            >
              {node.is_dir && (
                <span 
                  className="mr-1 transform transition-transform inline-block"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <ChevronRightIcon 
                    size={16} 
                    className="text-gray-600"
                  />
                </span>
              )}
              
              <span className="mr-2">
                {node.is_dir ? <FolderIcon size={16} /> : <FileIcon size={16} />}
              </span>
              
              <span className="text-sm truncate">{node.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleRename(node)}>Rename</ContextMenuItem>
            <ContextMenuItem onClick={() => handleDelete(node)}>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        
        {/* Render children if expanded */}
        {node.is_dir && isExpanded && node.children && 
          // Remove duplicates by path before rendering
          Array.from(new Map(node.children.map(child => [child.path, child])).values())
            .map(child => renderNode(child, depth + 1))
        }
      </div>
    )
  }

  // Handle rename action
  const handleRename = (node: FileNode) => {
    setNodeToRename(node)
    setNewFileName(node.name)
    setIsRenaming(true)
  }

  // Handle delete action
  const handleDelete = (node: FileNode) => {
    setNodeToDelete(node)
    setIsDeleting(true)
  }

  // Submit rename to backend
  const submitRename = async () => {
    if (!nodeToRename || !newFileName) return
    
    try {
      const token = await authService.getToken()
      const oldPath = nodeToRename.path
      const pathParts = oldPath.split('/')
      pathParts.pop() // Remove the last part (current filename)
      const newPath = [...pathParts, newFileName].join('/')
      
      // Get the root path from the file explorer store
      const rootPath = useFileExplorerStore.getState().rootPath
      
      const response = await fetch('http://localhost:8000/api/v1/file-explorer/rename-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_path: oldPath,
          new_path: newPath,
          root_path: rootPath
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Rename file error response:', errorData)
        throw new Error(errorData.detail || 'Failed to rename file')
      }
      
      // Close the dialog and refresh file tree
      setIsRenaming(false)
      refreshFileTree()
      
      // If this was a file that's open in tabs, update the tab paths
      if (!nodeToRename.is_dir) {
        const tabs = useTabStore.getState().getAllTabs()
        const tabToUpdate = tabs.find(tab => tab.path === oldPath)
        if (tabToUpdate) {
          useTabStore.getState().updateTab(tabToUpdate.id, {
            path: newPath,
            name: newFileName
          })
        }
      }
    } catch (error) {
      console.error('Error renaming file:', error)
      let errorMessage = 'Failed to rename file';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle case where error might be a JSON object
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      
      alert(`Failed to rename file: ${errorMessage}`);
    }
  }

  // Submit delete to backend
  const submitDelete = async () => {
    if (!nodeToDelete) return
    
    try {
      const token = await authService.getToken()
      // Get the root path from the file explorer store
      const rootPath = useFileExplorerStore.getState().rootPath
      
      // Delete endpoint uses query parameters, not body
      const queryParams = new URLSearchParams({
        path: nodeToDelete.path,
        root_path: rootPath
      }).toString()
      
      const response = await fetch(`http://localhost:8000/api/v1/file-explorer/delete-file?${queryParams}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Delete file error response:', errorData)
        throw new Error(errorData.detail || 'Failed to delete file')
      }
      
      // Close the dialog and refresh file tree
      setIsDeleting(false)
      refreshFileTree()
      
      // If this was a file that's open in tabs, close the tab
      if (!nodeToDelete.is_dir) {
        const tabs = useTabStore.getState().getAllTabs()
        const tabToClose = tabs.find(tab => tab.path === nodeToDelete.path)
        if (tabToClose) {
          useTabStore.getState().closeTab(tabToClose.id)
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      let errorMessage = 'Failed to delete file';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle case where error might be a JSON object
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      
      alert(`Failed to delete file: ${errorMessage}`);
    }
  }

  // Handle new file creation
  const handleNewFile = () => {
    setNewFileInput('')
    setIsNewFileDialogOpen(true)
  }
  
  // Get the currently selected folder path for new file/folder creation
  const getSelectedFolderPath = (): string => {
    // If there's an active path and it's a directory, use it
    if (activePath && fileTree) {
      const activeNode = findNodeByPath(fileTree, activePath)
      if (activeNode && activeNode.is_dir) {
        return activePath
      }
      
      // If active path is a file, use its parent directory
      if (activeNode && !activeNode.is_dir) {
        return activeNode.path.substring(0, activeNode.path.lastIndexOf('/'))
      }
    }
    
    // If there are selected paths and the first one is a directory, use it
    if (selectedPaths.length > 0 && fileTree) {
      const selectedNode = findNodeByPath(fileTree, selectedPaths[0])
      if (selectedNode && selectedNode.is_dir) {
        return selectedPaths[0]
      }
      
      // If selected path is a file, use its parent directory
      if (selectedNode && !selectedNode.is_dir) {
        return selectedNode.path.substring(0, selectedNode.path.lastIndexOf('/'))
      }
    }
    
    // Default to root path if no folder is selected
    return rootPath
  }
  
  // Helper function to get all currently expanded paths
  const getExpandedPaths = (): string[] => {
    if (!fileTree) return []
    
    const expandedPaths: string[] = []
    
    // Recursive function to find all expanded nodes
    const findExpandedNodes = (node: FileNode) => {
      if (node.is_dir && isNodeExpanded(node.path)) {
        expandedPaths.push(node.path)
      }
      
      if (node.children) {
        for (const child of node.children) {
          if (child.is_dir) {
            findExpandedNodes(child)
          }
        }
      }
    }
    
    findExpandedNodes(fileTree)
    return expandedPaths
  }
  
  // Helper function to restore expanded paths after a refresh
  const restoreExpandedPaths = (paths: string[]) => {
    // For each path that was previously expanded, expand it again
    paths.forEach(path => {
      if (fileTree) {
        const node = findNodeByPath(fileTree, path)
        if (node && node.is_dir) {
          toggleNode(path) // Toggle the node expansion
        }
      }
    })
  }
  
  // Submit new file creation
  const submitNewFile = async () => {
    if (newFileInput.trim()) {
      // Get the parent folder path where the file should be created
      const parentPath = getSelectedFolderPath()
      
      // Store the current expanded paths before creating the file
      const expandedPaths = getExpandedPaths()
      
      // Create the file
      await createNewFile(newFileInput.trim(), parentPath)
      setIsNewFileDialogOpen(false)
      
      // Force refresh the file tree
      await refreshFileTree()
      
      // Restore the expanded paths
      restoreExpandedPaths(expandedPaths)
    }
  }
  
  // Handle new folder creation
  const handleNewFolder = () => {
    setNewFolderInput('')
    setIsNewFolderDialogOpen(true)
  }
  
  // Submit new folder creation
  const submitNewFolder = async () => {
    if (newFolderInput.trim()) {
      // Get the parent folder path where the folder should be created
      const parentPath = getSelectedFolderPath()
      
      // Store the current expanded paths before creating the folder
      const expandedPaths = getExpandedPaths()
      
      // Create the folder
      await createNewFolder(newFolderInput.trim(), parentPath)
      setIsNewFolderDialogOpen(false)
      
      // Force refresh the file tree
      await refreshFileTree()
      
      // Restore the expanded paths
      restoreExpandedPaths(expandedPaths)
    }
  }
  
  // Helper function to find a node by its path in the file tree
  const findNodeByPath = (node: FileNode | null, path: string): FileNode | null => {
    if (!node) return null
    if (node.path === path) return node
    
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeByPath(child, path)
        if (found) return found
      }
    }
    
    return null
  }
  
  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col border-r border-gray-200">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium">File Explorer</h3>
        <div className="flex items-center space-x-1">
          {/* New File Button */}
          <button 
            onClick={handleNewFile}
            className="p-1 hover:bg-gray-200 rounded-md"
            title="New File"
          >
            <FilePlusIcon size={16} />
          </button>
          
          {/* New Folder Button */}
          <button 
            onClick={handleNewFolder}
            className="p-1 hover:bg-gray-200 rounded-md"
            title="New Folder"
          >
            <FolderPlusIcon size={16} />
          </button>
          
          {/* Collapse All Button */}
          <button 
            onClick={collapseAll}
            className="p-1 hover:bg-gray-200 rounded-md"
            title="Collapse All"
          >
            <ChevronsDownIcon size={16} />
          </button>
          
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-200 rounded-md"
            title="Refresh"
          >
            <RefreshCwIcon size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
     
      
      {/* File tree */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading files...
          </div>
        )}
        
        {error && (
          <div className="p-4 text-center text-sm text-red-500">
            Error: {error}
          </div>
        )}
        
        {!isLoading && !error && fileTree && (
          <div className="py-2">
            {fileTree.children?.map(node => renderNode(node))} 
          </div>
        )}
        
        {!isLoading && !error && !fileTree && (
          <div className="p-4 text-center text-sm text-gray-500">
            No files found. Click refresh to load files.
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenaming} onOpenChange={(open) => !open && setIsRenaming(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {nodeToRename?.is_dir ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Enter a new name for the {nodeToRename?.is_dir ? 'folder' : 'file'}.
              {!nodeToRename?.is_dir && ' The file extension will be preserved.'}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={(open) => !open && setIsDeleting(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {nodeToDelete?.is_dir ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{nodeToDelete?.name}"?
              {nodeToDelete?.is_dir && ' This will delete all contents inside this folder.'}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                onClick={() => setIsDeleting(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={submitDelete}
              >
                Delete
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New File Dialog */}
      <Dialog open={isNewFileDialogOpen} onOpenChange={(open) => !open && setIsNewFileDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Enter a name for the new file. Include the file extension (e.g., .js, .txt, .py).
              <br />
              <span className="text-sm font-medium mt-2 block">Location: {getSelectedFolderPath()}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600"
              value={newFileInput}
              onChange={(e) => setNewFileInput(e.target.value)}
              placeholder="filename.ext"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submitNewFile()}
            />
          </div>
          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                onClick={() => setIsNewFileDialogOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={submitNewFile}
              >
                Create
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={(open) => !open && setIsNewFolderDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
              <br />
              <span className="text-sm font-medium mt-2 block">Location: {getSelectedFolderPath()}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              className="w-full p-2 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600"
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              placeholder="folder name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submitNewFolder()}
            />
          </div>
          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <button 
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                onClick={() => setIsNewFolderDialogOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={submitNewFolder}
              >
                Create
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FileExplorer