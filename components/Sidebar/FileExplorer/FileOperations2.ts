import { useFileExplorerStore } from './utils/store'
import { FileNode } from './utils/FileExplorerClass'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import * as authService from '@/lib/services/auth-service'
import { host, port } from '@/config/server'
import { getExpandedPaths, restoreExpandedPaths } from './FileHelpers'

// Submit delete to backend
export const deleteFile = async (
  nodeToDelete: FileNode | null,
  refreshFileTree: () => Promise<void>
) => {
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
    
    const response = await fetch(`http://${host}:${port}/api/v1/file-explorer/delete-file?${queryParams}`, {
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
      const tabToClose = tabs.find(tab => tab.path === nodeToDelete.path)
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

// Create new file with expanded paths preservation
export const createNewFileWithExpansion = async (
  fileName: string,
  parentPath: string,
  fileTree: FileNode | null,
  isNodeExpanded: (path: string) => boolean,
  toggleNode: (path: string) => void,
  createNewFile: (name: string, parentPath: string) => Promise<void>,
  refreshFileTree: () => Promise<void>
) => {
  if (fileName.trim()) {
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
    
    return true
  }
  return false
}

// Create new folder with expanded paths preservation
export const createNewFolderWithExpansion = async (
  folderName: string,
  parentPath: string,
  fileTree: FileNode | null,
  isNodeExpanded: (path: string) => boolean,
  toggleNode: (path: string) => void,
  createNewFolder: (name: string, parentPath: string) => Promise<void>,
  refreshFileTree: () => Promise<void>
) => {
  if (folderName.trim()) {
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
    
    return true
  }
  return false
}
