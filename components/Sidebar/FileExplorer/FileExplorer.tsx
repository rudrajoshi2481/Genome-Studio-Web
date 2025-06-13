import React, { useEffect, useState } from 'react'
import { useFileExplorerStore } from './utils/store'
import { FileNode } from './utils/FileExplorerClass'
import { FolderIcon, FileIcon, ChevronRightIcon, RefreshCwIcon, FilePlusIcon, FolderPlusIcon, ChevronsDownIcon } from 'lucide-react'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import FileService from '@/components/services/file-service'

const FileExplorer: React.FC = () => {
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
    setRootPath
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
        
        {/* Render children if expanded */}
        {node.is_dir && isExpanded && node.children && 
          // Remove duplicates by path before rendering
          Array.from(new Map(node.children.map(child => [child.path, child])).values())
            .map(child => renderNode(child, depth + 1))
        }
      </div>
    )
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
            onClick={() => {
              const fileName = prompt('Enter file name:');
              if (fileName) {
                createNewFile(fileName);
              }
            }}
            className="p-1 hover:bg-gray-200 rounded-md"
            title="New File"
          >
            <FilePlusIcon size={16} />
          </button>
          
          {/* New Folder Button */}
          <button 
            onClick={() => {
              const folderName = prompt('Enter folder name:');
              if (folderName) {
                createNewFolder(folderName);
              }
            }}
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
    </div>
  )
}

export default FileExplorer