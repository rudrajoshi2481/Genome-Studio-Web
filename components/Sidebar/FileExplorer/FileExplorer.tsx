import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useFileExplorerStore } from './utils/store'
import { FileNode } from './utils/FileExplorerClass'
import { RefreshCwIcon, FilePlusIcon, FolderPlusIcon, ChevronsDownIcon, UploadIcon, HomeIcon } from 'lucide-react'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import { uploadFiles, uploadFolder, hasDragItems, getDragTargetNode, DragDropState } from './DragDropUtils'

// Import components and utilities from split files
import FileNodeComponent from './FileNode'
import { RenameDialog, DeleteDialog } from './FileDialogs'
import { NewFileDialog, NewFolderDialog } from './FileDialogs2'
import { openFileInTab, getSelectedFolderPath, renameFile, deleteFile } from './FileOperations'
import { getExpandedPaths, restoreExpandedPaths } from './FileHelpers'
import UploadProgress from './UploadProgress'

// Import breadcrumb components from shadcn UI
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Import context menu components from shadcn UI
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

const FileExplorer: React.FC = () => {
  // State for rename dialog
  const [isRenaming, setIsRenaming] = useState(false)
  const [nodeToRename, setNodeToRename] = useState<FileNode | null>(null)
  
  // State for delete confirmation dialog
  const [isDeleting, setIsDeleting] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<FileNode | null>(null)
  
  // State for new file dialog
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false)
  
  // State for new folder dialog
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false)
  
  // State for drag and drop
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    dragTarget: null
  })
  
  // State for upload progress
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
  const [bytesUploaded, setBytesUploaded] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [filesCompleted, setFilesCompleted] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  
  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    fileTree,
    isLoading,
    error,
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

  // Initial fetch of the file tree
  useEffect(() => {
    // Set the default root path to /home
    setRootPath('/home')
    
    // Then refresh the file tree with the new path
    refreshFileTree()
    
    // Cleanup WebSocket connection when component unmounts
    return () => {
      useFileExplorerStore.getState().disconnectWebSocket()
    }
  }, [refreshFileTree, setRootPath])
  
  // Listen for custom events from FileNodeComponent
  useEffect(() => {
    // Event handler for new file action
    const handleNewFileEvent = () => {
      setIsNewFileDialogOpen(true)
    }
    
    // Event handler for new folder action
    const handleNewFolderEvent = () => {
      setIsNewFolderDialogOpen(true)
    }
    
    // Add event listeners
    window.addEventListener('fileexplorer:newfile', handleNewFileEvent)
    window.addEventListener('fileexplorer:newfolder', handleNewFolderEvent)
    
    // Cleanup event listeners when component unmounts
    return () => {
      window.removeEventListener('fileexplorer:newfile', handleNewFileEvent)
      window.removeEventListener('fileexplorer:newfolder', handleNewFolderEvent)
    }
  }, [])

  // Handle file open action
  const handleOpenFile = (node: FileNode) => {
    openFileInTab(node)
  }

  // Handle rename action
  const handleRename = (node: FileNode) => {
    setNodeToRename(node)
    setIsRenaming(true)
  }

  // Handle delete action
  const handleDelete = (node: FileNode) => {
    setNodeToDelete(node)
    setIsDeleting(true)
  }

  // Submit rename
  const submitRename = async (newName: string) => {
    if (nodeToRename) {
      try {
        // Store the current expanded paths before renaming
        const expandedPaths = getExpandedPaths(fileTree, isNodeExpanded)
        
        // Call the rename function from FileOperations
        await renameFile(nodeToRename, newName, refreshFileTree)
        
        // Get the updated file tree after refresh
        const updatedFileTree = useFileExplorerStore.getState().fileTree
        
        // Restore the expanded paths with the updated tree
        if (updatedFileTree) {
          restoreExpandedPaths(updatedFileTree, expandedPaths, toggleNode)
        }
      } catch (error) {
        console.error('Error renaming file:', error)
        alert(`Failed to rename file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    setIsRenaming(false)
  }

  // Submit delete
  const submitDelete = async () => {
    if (nodeToDelete) {
      try {
        // Store the current expanded paths before deleting
        const expandedPaths = getExpandedPaths(fileTree, isNodeExpanded)
        
        // Call the delete function from FileOperations
        await deleteFile(nodeToDelete, refreshFileTree)
        
        // Get the updated file tree after refresh
        const updatedFileTree = useFileExplorerStore.getState().fileTree
        
        // Restore the expanded paths with the updated tree
        if (updatedFileTree) {
          restoreExpandedPaths(updatedFileTree, expandedPaths, toggleNode)
        }
      } catch (error) {
        console.error('Error deleting file:', error)
        alert(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    setIsDeleting(false)
  }

  // Handle new file button click
  const handleNewFileClick = () => {
    setIsNewFileDialogOpen(true)
  }

  // Handle new folder button click
  const handleNewFolderClick = () => {
    setIsNewFolderDialogOpen(true)
  }
  
  // Track the path where the context menu was opened
  const [contextMenuPath, setContextMenuPath] = useState<string | null>(null)
  
  // Handle context menu actions with the path from right-click
  const handleContextMenuAction = (action: 'newFile' | 'newFolder') => {
    // Set the selected path to the context menu path if available
    if (contextMenuPath) {
      // Temporarily select this path for the file/folder creation
      selectNode(contextMenuPath)
    }
    
    if (action === 'newFile') {
      setIsNewFileDialogOpen(true)
    } else if (action === 'newFolder') {
      setIsNewFolderDialogOpen(true)
    }
  }
  
  // Handle context menu from FileNodeComponent
  const handleNodeContextMenu = (path: string, isDirectory: boolean) => {
    setContextMenuPath(path)
    // If it's a directory, we'll use this path for creating new files/folders
    // If it's a file, we'll use its parent directory
    if (!isDirectory && path) {
      // For files, use the parent directory
      const parentPath = path.substring(0, path.lastIndexOf('/'))
      if (parentPath) {
        setContextMenuPath(parentPath)
      }
    }
  }
  
  // Handle file upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const destinationPath = getSelectedFolderPath(fileTree, activePath, selectedPaths, rootPath)
      handleFileUpload(Array.from(files), destinationPath)
    }
    // Reset the input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // Handle file upload
  const handleFileUpload = useCallback(async (files: File[], destinationPath: string) => {
    if (files.length === 0) return
    
    // Calculate total size of all files
    const totalSize = files.reduce((total, file) => total + file.size, 0)
    setTotalBytes(totalSize)
    setBytesUploaded(0)
    setFilesCompleted(0)
    setTotalFiles(files.length)
    
    setIsUploading(true)
    setCurrentFileName(files[0].name)
    
    try {
      await uploadFiles(
        files,
        destinationPath,
        (progress, uploadedBytes, fileIndex, totalFilesCount) => {
          setUploadProgress(progress)
          setBytesUploaded(uploadedBytes)
          
          // Update file completion tracking
          if (fileIndex !== undefined) {
            setFilesCompleted(fileIndex)
          }
          
          // Update total files if provided
          if (totalFilesCount !== undefined) {
            setTotalFiles(totalFilesCount)
          }
        },
        async () => {
          // Refresh the file tree after upload
          await refreshFileTree()
          
          // Restore expanded paths
          const expandedPaths = getExpandedPaths(fileTree, isNodeExpanded)
          const updatedFileTree = useFileExplorerStore.getState().fileTree
          if (updatedFileTree) {
            restoreExpandedPaths(updatedFileTree, expandedPaths, toggleNode)
          }
        },
        (error) => {
          console.error('Upload error:', error)
          alert(`Upload failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      )
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [fileTree, refreshFileTree, isNodeExpanded, toggleNode])
  
  // Handle folder upload
  const handleFolderUpload = useCallback(async (items: DataTransferItemList, destinationPath: string) => {
    if (items.length === 0) return
    
    setIsUploading(true)
    setCurrentFileName('folder')
    
    try {
      await uploadFolder(
        items,
        destinationPath,
        (progress) => {
          setUploadProgress(progress)
        },
        async () => {
          // Refresh the file tree after upload
          await refreshFileTree()
          
          // Restore expanded paths
          const expandedPaths = getExpandedPaths(fileTree, isNodeExpanded)
          const updatedFileTree = useFileExplorerStore.getState().fileTree
          if (updatedFileTree) {
            restoreExpandedPaths(updatedFileTree, expandedPaths, toggleNode)
          }
        },
        (error) => {
          console.error('Upload error:', error)
          alert(`Upload failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      )
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [fileTree, refreshFileTree, isNodeExpanded, toggleNode])
  
  // Get node from path
  const getNodeFromPath = useCallback((path: string): FileNode | null => {
    if (!fileTree) return null
    
    // If it's the root path
    if (path === fileTree.path) return fileTree
    
    // Helper function to recursively find a node
    const findNode = (node: FileNode, targetPath: string): FileNode | null => {
      if (node.path === targetPath) return node
      
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, targetPath)
          if (found) return found
        }
      }
      
      return null
    }
    
    return findNode(fileTree, path)
  }, [fileTree])
  
  // Drag event handlers
  const handleDragOver = useCallback((event: React.DragEvent) => {
    // Prevent default to allow drop
    event.preventDefault()
    
    // Only proceed if the drag contains files
    if (!hasDragItems(event)) return
    
    // Get the target node
    const targetNode = getDragTargetNode(event, fileTree, getNodeFromPath)
    
    // Only allow dropping on directories
    if (targetNode && (targetNode.is_dir || targetNode === fileTree)) {
      // Update drag state
      setDragState({
        isDragging: true,
        dragTarget: targetNode
      })
      
      // Set the drop effect
      event.dataTransfer.dropEffect = 'copy'
    } else {
      // Not a valid drop target
      event.dataTransfer.dropEffect = 'none'
    }
  }, [fileTree, getNodeFromPath])
  
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    if (!hasDragItems(event)) return
  }, [])
  
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    
    // Check if we're leaving the file explorer entirely
    const relatedTarget = event.relatedTarget as Node
    const fileExplorerElement = document.querySelector('.file-explorer-container')
    
    if (!fileExplorerElement?.contains(relatedTarget)) {
      setDragState({
        isDragging: false,
        dragTarget: null
      })
    }
  }, [])
  
  const handleDrop = useCallback((event: React.DragEvent) => {
    // Prevent default behavior
    event.preventDefault()
    
    // Reset drag state
    setDragState({
      isDragging: false,
      dragTarget: null
    })
    
    console.log('[FileExplorer] Drop event detected', {
      items: event.dataTransfer.items.length,
      files: event.dataTransfer.files.length
    })
    
    // Only proceed if the drag contains files
    if (!hasDragItems(event)) {
      console.log('[FileExplorer] Drop event does not contain files')
      return
    }
    
    // Get the target node
    const targetNode = getDragTargetNode(event, fileTree, getNodeFromPath)
    
    console.log('[FileExplorer] Drop target node:', targetNode ? {
      path: targetNode.path,
      isDirectory: targetNode.is_dir || targetNode === fileTree,
      name: targetNode.name
    } : 'No target node found')
    
    // Only allow dropping on directories
    if (targetNode && (targetNode.is_dir || targetNode === fileTree)) {
      const destinationPath = targetNode.path
      console.log('[FileExplorer] Uploading to destination path:', destinationPath)
      
      // Handle files vs. folders
      if (event.dataTransfer.items) {
        // Check if we have a directory
        let hasDirectory = false
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
          const item = event.dataTransfer.items[i]
          if (item.webkitGetAsEntry && item.webkitGetAsEntry()?.isDirectory) {
            hasDirectory = true
            break
          }
        }
        
        if (hasDirectory) {
          // Handle folder upload
          handleFolderUpload(event.dataTransfer.items, destinationPath)
        } else {
          // Handle file upload
          const files = Array.from(event.dataTransfer.files)
          handleFileUpload(files, destinationPath)
        }
      } else if (event.dataTransfer.files) {
        // Fallback for browsers that don't support DataTransferItemList
        const files = Array.from(event.dataTransfer.files)
        handleFileUpload(files, destinationPath)
      }
    }
  }, [fileTree, getNodeFromPath, handleFileUpload, handleFolderUpload])

  // Submit new file creation
  const submitNewFile = async (fileName: string) => {
    if (fileName.trim()) {
      // Get the parent folder path where the file should be created
      // This is now passed directly from the dialog component
      const parentPath = getSelectedFolderPath(fileTree, activePath, selectedPaths, rootPath)
      
      // Store the current expanded paths before creating the file
      const expandedPaths = getExpandedPaths(fileTree, isNodeExpanded)
      
      // Create the file
      await createNewFile(fileName.trim(), parentPath)
      
      // Force refresh the file tree
      await refreshFileTree()
      
      // Get the updated file tree after refresh
      const updatedFileTree = useFileExplorerStore.getState().fileTree
      
      // Restore the expanded paths with the updated tree
      if (updatedFileTree) {
        restoreExpandedPaths(updatedFileTree, expandedPaths, toggleNode)
      }
    }
  }
  
  // Submit new folder creation
  const submitNewFolder = async (folderName: string) => {
    if (folderName.trim()) {
      // Get the parent folder path where the folder should be created
      // This is now passed directly from the dialog component
      const parentPath = getSelectedFolderPath(fileTree, activePath, selectedPaths, rootPath)
      
      // Store the current expanded paths before creating the folder
      const expandedPaths = getExpandedPaths(fileTree, isNodeExpanded)
      
      // Create the folder
      await createNewFolder(folderName.trim(), parentPath)
      
      // Force refresh the file tree
      await refreshFileTree()
      
      // Get the updated file tree after refresh
      const updatedFileTree = useFileExplorerStore.getState().fileTree
      
      // Restore the expanded paths with the updated tree
      if (updatedFileTree) {
        restoreExpandedPaths(updatedFileTree, expandedPaths, toggleNode)
      }
    }
  }

  // Cancel upload
  const cancelUpload = () => {
    setIsUploading(false)
    setUploadProgress(0)
    // Note: This doesn't actually abort the upload in progress
    // To implement actual cancellation, you would need to use AbortController
  }
  
  // Render the file explorer
  return (
    <div 
      className="h-full flex flex-col file-explorer-container overflow-y-hidden"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ height: '100%', maxHeight: '100%' }}
    >
      {/* Header with buttons - fixed height */}
      <div className="flex items-center justify-between p-2 border-b flex-shrink-0">
        <div className="text-sm font-medium">Explorer</div>
        <div className="flex space-x-1">
          <button
            onClick={() => refreshFileTree()}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            title="Refresh"
          >
            <RefreshCwIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleNewFileClick}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            title="New File"
          >
            <FilePlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleNewFolderClick}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            title="New Folder"
          >
            <FolderPlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            title="Collapse All"
          >
            <ChevronsDownIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleUploadClick}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            title="Upload Files"
          >
            <UploadIcon className="h-4 w-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            className="hidden"
          />
        </div>
      </div>
      
      {/* Breadcrumb navigation - fixed height */}
      <div className="px-2 py-1 border-b flex-shrink-0">
        {fileTree && (
          <Breadcrumb>
            <BreadcrumbList className="flex-wrap">
              <BreadcrumbItem>
                <BreadcrumbLink 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setRootPath('/home');
                    refreshFileTree();
                  }}
                  className="flex items-center"
                >
                  <HomeIcon className="h-3 w-3 mr-1" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              
              {rootPath.split('/').slice(2).map((segment, index, array) => {
                // Create path up to this segment
                const pathToSegment = '/home/' + array.slice(0, index + 1).join('/');
                
                return (
                  <React.Fragment key={index}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === array.length - 1 ? (
                        <span className="font-medium">{segment}</span>
                      ) : (
                        <BreadcrumbLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setRootPath(pathToSegment);
                            refreshFileTree();
                          }}
                        >
                          {segment}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
      
      {/* File tree with context menu - only this section should scroll */}
      <div className="flex-1 flex overflow-hidden">
        <ContextMenu onOpenChange={(open) => {
          // Reset context menu path when menu closes
          if (!open) setContextMenuPath(null);
        }}>
          <ContextMenuTrigger className="flex-1 w-full h-full" onContextMenu={() => {
            // When right-clicking on the empty area (not on a specific file/folder),
            // set the context menu path to the root path
            setContextMenuPath(rootPath);
          }}>
            <div className={`w-full h-full overflow-y-auto overflow-x-hidden p-2 ${dragState.isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              {isLoading ? (
                <div className="text-sm text-gray-500 p-2">Loading...</div>
              ) : error ? (
                <div className="text-sm text-red-500 p-2">Error: {error}</div>
              ) : fileTree && fileTree.children ? (
                // Render children of root instead of root itself
                // Sort to show folders first, then files
                fileTree.children
                  .sort((a, b) => {
                    // Folders first, then files
                    if (a.is_dir && !b.is_dir) return -1;
                    if (!a.is_dir && b.is_dir) return 1;
                    // Within same type, sort alphabetically
                    return a.name.localeCompare(b.name);
                  })
                  .map((childNode, index) => (
                    <FileNodeComponent
                      key={childNode.path}
                      node={childNode}
                      depth={0}
                      onToggle={toggleNode}
                      onSelect={selectNode}
                      isNodeExpanded={isNodeExpanded}
                      onOpenFile={handleOpenFile}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onContextMenu={handleNodeContextMenu}
                    />
                  ))
              ) : (
                <div className="text-sm text-gray-500 p-2">No files found</div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleContextMenuAction('newFile')}>
              <FilePlusIcon className="h-4 w-4 mr-2" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleContextMenuAction('newFolder')}>
              <FolderPlusIcon className="h-4 w-4 mr-2" />
              New Folder
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      
      {/* Dialogs */}
      {isRenaming && nodeToRename && (
        <RenameDialog
          isOpen={isRenaming}
          onClose={() => setIsRenaming(false)}
          node={nodeToRename}
          onRename={submitRename}
        />
      )}
      
      {isDeleting && nodeToDelete && (
        <DeleteDialog
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
          node={nodeToDelete}
          onDelete={submitDelete}
        />
      )}
      
      {/* New File Dialog */}
      <NewFileDialog
        isOpen={isNewFileDialogOpen}
        onClose={() => setIsNewFileDialogOpen(false)}
        onCreate={submitNewFile}
        parentPath={getSelectedFolderPath(fileTree, activePath, selectedPaths, rootPath)}
      />
      
      {/* New Folder Dialog */}
      <NewFolderDialog
        isOpen={isNewFolderDialogOpen}
        onClose={() => setIsNewFolderDialogOpen(false)}
        onCreate={submitNewFolder}
        parentPath={getSelectedFolderPath(fileTree, activePath, selectedPaths, rootPath)}
      />
      
      {/* Upload Progress */}
      <UploadProgress
        isUploading={isUploading}
        progress={uploadProgress}
        fileName={currentFileName}
        onCancel={cancelUpload}
        bytesUploaded={bytesUploaded}
        totalBytes={totalBytes}
        filesCompleted={filesCompleted}
        totalFiles={totalFiles}
      />
    </div>
  )
}

export default FileExplorer
