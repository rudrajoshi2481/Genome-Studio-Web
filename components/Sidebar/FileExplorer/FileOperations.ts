import { useFileExplorerStore } from './utils/store'
import { FileNode } from './utils/FileExplorerClass'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import * as authService from '@/lib/services/auth-service'
import { host, port } from '@/config/server'
import { findNodeByPath, getExpandedPaths, restoreExpandedPaths } from './FileHelpers'

// Get the currently selected folder path for new file/folder creation
export const getSelectedFolderPath = (
  fileTree: FileNode | null,
  activePath: string | null,
  selectedPaths: string[],
  rootPath: string
): string => {
  // VS Code-like behavior: If no folder is explicitly selected (clicked on),
  // default to the root directory
  
  // Check if we have an explicitly selected directory
  if (selectedPaths.length > 0 && fileTree) {
    const selectedNode = findNodeByPath(fileTree, selectedPaths[0])
    if (selectedNode) {
      if (selectedNode.is_dir) {
        // If it's a directory, use it directly
        return selectedPaths[0]
      } else {
        // If it's a file, use its parent directory
        return selectedNode.path.substring(0, selectedNode.path.lastIndexOf('/'))
      }
    }
  }
  
  // If no explicit selection exists, but we have an active path, use it
  if (activePath && fileTree && activePath !== rootPath) {
    const activeNode = findNodeByPath(fileTree, activePath)
    if (activeNode && activeNode.is_dir) {
      // Only use active path if it's a directory
      return activePath
    } else if (activeNode) {
      // If it's a file, use its parent directory
      return activeNode.path.substring(0, activeNode.path.lastIndexOf('/'))
    }
  }
  
  // Default to root path if no explicit selection is found
  // or if user clicked in empty space in the file explorer
  return rootPath
}

// Function to open a file in a tab
export const openFileInTab = async (node: FileNode) => {
  // Get all existing tabs
  const tabs = useTabStore.getState().getAllTabs()
  
  // Check if file is already open in a tab
  const existingTab = tabs.find(tab => tab.path === node.path)
  
  if (existingTab) {
    // If tab already exists, just activate it
    useTabStore.getState().activateTab(existingTab.id)
  } else {
    try {
      // Add the file to tabs with empty content initially
      // Content will be loaded in the EditorWindow component
      useTabStore.getState().addTab(node.path, node.name, '')
    } catch (error) {
      console.error('Error opening file:', error)
      // Show error in a user-friendly way
      alert(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// Submit rename to backend
export const renameFile = async (
  nodeToRename: FileNode | null,
  newFileName: string,
  refreshFileTree: () => void
) => {
  if (!nodeToRename || !newFileName) return
  
  try {
    const token = await authService.getToken()
    const oldPath = nodeToRename.path
    const pathParts = oldPath.split('/')
    pathParts.pop() // Remove the last part (current filename)
    const newPath = [...pathParts, newFileName].join('/')
    
    // Get the root path from the file explorer store
    const rootPath = useFileExplorerStore.getState().rootPath
    
    const response = await fetch(`http://${host}:${port}/api/v1/file-explorer/rename-file`, {
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
    
    // Refresh file tree
    await refreshFileTree()
    
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
    
    return true
  } catch (error) {
    console.error('Error renaming file:', error)
    let errorMessage = 'Failed to rename file';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }
    
    alert(`Failed to rename file: ${errorMessage}`);
    return false
  }
}

// Submit delete to backend
export const deleteFile = async (
  nodeToDelete: FileNode | null,
  refreshFileTree: () => void
) => {
  if (!nodeToDelete) return
  
  try {
    const token = await authService.getToken()
    const path = nodeToDelete.path
    
    // Get the root path from the file explorer store
    const rootPath = useFileExplorerStore.getState().rootPath
    
    // Build the URL with query parameters for DELETE request
    const url = new URL(`http://${host}:${port}/api/v1/file-explorer/delete-file`);
    url.searchParams.append('path', path);
    url.searchParams.append('root_path', rootPath);
    
    const response = await fetch(url.toString(), {
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
    
    // Refresh file tree
    await refreshFileTree()
    
    // If this was a file that's open in tabs, close the tab
    if (!nodeToDelete.is_dir) {
      const tabs = useTabStore.getState().getAllTabs()
      const tabToClose = tabs.find(tab => tab.path === path)
      if (tabToClose) {
        useTabStore.getState().closeTab(tabToClose.id)
      }
    }
    
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    let errorMessage = 'Failed to delete file';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }
    
    alert(`Failed to delete file: ${errorMessage}`);
    return false
  }
}
