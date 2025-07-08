import { FileNode } from './utils/FileExplorerClass'
import { findNodeByPath } from './FileHelpers'

/**
 * Get the currently selected folder path for new file/folder creation
 * This improved version ensures files are only created in explicitly selected folders
 */
export const getSelectedFolderPath = (
  fileTree: FileNode | null,
  activePath: string | null,
  selectedPaths: string[],
  rootPath: string
): string => {
  // Only use explicitly selected paths - either active path or selected paths
  // This ensures we don't create files in unexpected locations when clicking outside
  
  // First check if we have an explicitly selected directory
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
  
  // If no explicit selection or selection not found, check active path
  if (activePath && fileTree) {
    const activeNode = findNodeByPath(fileTree, activePath)
    if (activeNode) {
      if (activeNode.is_dir) {
        return activePath
      } else {
        return activeNode.path.substring(0, activeNode.path.lastIndexOf('/'))
      }
    }
  }
  
  // Default to root path if no explicit selection is found
  return rootPath
}
