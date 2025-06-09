import { FileNode } from '../types';

// Constants
const ROOT_PATH = '/';
const PATH_SEPARATOR = '/';
const EMPTY_STRING = '';

// Type definitions for better type safety
type NodeUpdater = (node: FileNode) => FileNode;
type NodeComparator = (a: FileNode, b: FileNode) => number;

// Memoization cache for path normalization
const pathNormalizationCache = new Map<string, string>();

// Normalize paths by removing trailing slashes and handling empty paths
export const normalizePath = (path: string): string => {
  // Check cache first
  if (pathNormalizationCache.has(path)) {
    return pathNormalizationCache.get(path)!;
  }
  
  let normalized: string;
  if (path === ROOT_PATH || path === EMPTY_STRING) {
    normalized = ROOT_PATH;
  } else {
    normalized = path.replace(/\/+$/, EMPTY_STRING);
  }
  
  // Cache the result
  pathNormalizationCache.set(path, normalized);
  return normalized;
};

// Clear cache when it gets too large to prevent memory leaks
const clearCacheIfNeeded = (): void => {
  if (pathNormalizationCache.size > 1000) {
    pathNormalizationCache.clear();
  }
};

// Optimized node comparator for sorting
const nodeComparator: NodeComparator = (a, b) => {
  // Directories first
  if (a.type !== b.type) {
    return a.type === 'directory' ? -1 : 1;
  }
  // Then alphabetically
  return a.name.localeCompare(b.name);
};

// Helper function to extract parent path efficiently
const getParentPath = (nodePath: string): string => {
  const normalizedPath = normalizePath(nodePath);
  
  if (normalizedPath === ROOT_PATH) {
    return ROOT_PATH;
  }
  
  const lastSlashIndex = normalizedPath.lastIndexOf(PATH_SEPARATOR);
  
  if (lastSlashIndex <= 0) {
    return ROOT_PATH;
  }
  
  return normalizedPath.substring(0, lastSlashIndex);
};

// Helper function to transform backend data to our FileNode format
export const transformFileTree = (node: any): FileNode => {
  const normalizedPath = normalizePath(node.path);
  
  return {
    id: normalizedPath, // Use normalized path as ID
    name: node.name,
    path: normalizedPath,
    type: node.is_dir ? 'directory' : 'file',
    size: node.size,
    modified: node.modified,
    children: node.children?.map(transformFileTree)
  };
};

// Optimized helper function to find a node in the tree using iterative approach for better performance
export const findNodeInTree = (tree: FileNode, targetPath: string): FileNode | null => {
  const normalizedTarget = normalizePath(targetPath);
  const stack: FileNode[] = [tree];
  
  while (stack.length > 0) {
    const currentNode = stack.pop()!;
    const normalizedCurrentPath = normalizePath(currentNode.path);
    
    if (normalizedCurrentPath === normalizedTarget) {
      return currentNode;
    }
    
    // Add children to stack for processing (reverse order to maintain traversal order)
    if (currentNode.children) {
      for (let i = currentNode.children.length - 1; i >= 0; i--) {
        stack.push(currentNode.children[i]);
      }
    }
  }
  
  return null;
};

// Optimized helper function to find and update a node in the tree
export const updateNodeInTree = (tree: FileNode, targetPath: string, updater: NodeUpdater): FileNode => {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedTreePath = normalizePath(tree.path);
  
  if (normalizedTreePath === normalizedTarget) {
    return updater(tree);
  }
  
  if (!tree.children) {
    return tree;
  }
  
  let hasChanges = false;
  const updatedChildren = tree.children.map(child => {
    const updatedChild = updateNodeInTree(child, normalizedTarget, updater);
    if (updatedChild !== child) {
      hasChanges = true;
    }
    return updatedChild;
  });
  
  return hasChanges ? { ...tree, children: updatedChildren } : tree;
};

// Optimized helper function to add a node to the tree at the correct location
export const addNodeToTree = (tree: FileNode, newNode: FileNode): FileNode => {
  const newNodePath = normalizePath(newNode.path);
  const treePath = normalizePath(tree.path);
  const parentPath = getParentPath(newNodePath);
  
  // Early return if paths are identical
  if (treePath === newNodePath) {
    return newNode;
  }
  
  // If this tree node is the direct parent directory
  if (treePath === parentPath) {
    const existingChildren = tree.children || [];
    
    // Find existing node index more efficiently
    const existingIndex = existingChildren.findIndex(child => 
      normalizePath(child.path) === newNodePath
    );
    
    let newChildren: FileNode[];
    
    if (existingIndex >= 0) {
      // Replace existing node
      newChildren = [...existingChildren];
      newChildren[existingIndex] = newNode;
    } else {
      // Add new node and sort
      newChildren = [...existingChildren, newNode];
    }
    
    // Sort children efficiently
    newChildren.sort(nodeComparator);
    
    return {
      ...tree,
      children: newChildren
    };
  }
  
  // Recursively search for the parent directory
  if (!tree.children) {
    return tree;
  }
  
  let hasChanges = false;
  const updatedChildren = tree.children.map(child => {
    const result = addNodeToTree(child, newNode);
    if (result !== child) {
      hasChanges = true;
    }
    return result;
  });
  
  return hasChanges ? { ...tree, children: updatedChildren } : tree;
};

// Optimized helper function to remove a node from the tree
export const removeNodeFromTree = (tree: FileNode, targetPath: string): FileNode | null => {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedTreePath = normalizePath(tree.path);
  
  // If this is the target node, return null to remove it
  if (normalizedTreePath === normalizedTarget) {
    return null;
  }
  
  if (!tree.children) {
    return tree;
  }
  
  // Filter and recursively process children
  const filteredChildren: FileNode[] = [];
  let hasChanges = false;
  
  for (const child of tree.children) {
    const result = removeNodeFromTree(child, normalizedTarget);
    if (result === null) {
      hasChanges = true; // Child was removed
    } else {
      filteredChildren.push(result);
      if (result !== child) {
        hasChanges = true; // Child was modified
      }
    }
  }
  
  return hasChanges ? { ...tree, children: filteredChildren } : tree;
};

// Utility function to get tree statistics (useful for debugging/monitoring)
export const getTreeStats = (tree: FileNode): { totalNodes: number; directories: number; files: number; maxDepth: number } => {
  let totalNodes = 0;
  let directories = 0;
  let files = 0;
  let maxDepth = 0;
  
  const traverse = (node: FileNode, depth: number): void => {
    totalNodes++;
    maxDepth = Math.max(maxDepth, depth);
    
    if (node.type === 'directory') {
      directories++;
      if (node.children) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    } else {
      files++;
    }
  };
  
  traverse(tree, 0);
  
  return { totalNodes, directories, files, maxDepth };
};

// Cleanup function to clear caches
export const cleanup = (): void => {
  pathNormalizationCache.clear();
};

// Periodic cleanup (call this occasionally to prevent memory leaks)
setInterval(clearCacheIfNeeded, 60000); // Clean every minute if needed
