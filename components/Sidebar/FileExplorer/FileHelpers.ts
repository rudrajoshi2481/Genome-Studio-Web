import { FileNode } from './utils/FileExplorerClass'

// Helper function to find a node by its path in the file tree
export const findNodeByPath = (node: FileNode | null, path: string): FileNode | null => {
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
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper function to get all currently expanded paths
export const getExpandedPaths = (
  fileTree: FileNode | null,
  isNodeExpanded: (path: string) => boolean
): string[] => {
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
export const restoreExpandedPaths = (
  fileTree: FileNode | null,
  expandedPaths: string[],
  toggleNode: (path: string) => void
) => {
  // For each path that was previously expanded, expand it again
  expandedPaths.forEach(path => {
    if (fileTree) {
      const node = findNodeByPath(fileTree, path)
      if (node && node.is_dir) {
        toggleNode(path) // Toggle the node expansion
      }
    }
  })
}
