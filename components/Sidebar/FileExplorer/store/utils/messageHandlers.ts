import { FileExplorerState, FileNode, WebSocketMessage } from '../types';
import { addNodeToTree, findNodeInTree, removeNodeFromTree, transformFileTree, updateNodeInTree } from './treeUtils';

// Handle initial tree message
export const handleInitialTreeMessage = (
  data: WebSocketMessage, 
  set: (state: Partial<FileExplorerState>) => void,
  getRecentPaths: () => string[]
) => {
  if (data.tree && data.directory) {
    const fileTree = transformFileTree(data.tree);
    set({ 
      fileTree,
      isLoading: false,
      error: null,
      currentPath: data.directory,
      recentPaths: [
        data.directory,
        ...getRecentPaths().filter(p => p !== data.directory).slice(0, 9)
      ]
    });
    console.log('Loaded file tree for', data.directory);
  }
};

// Handle file changes message
export const handleFileChangesMessage = (
  data: WebSocketMessage,
  fileTree: FileNode | null,
  currentPath: string,
  wsConnection: WebSocket | null,
  set: (state: Partial<FileExplorerState>) => void
) => {
  if (!data.changes || !fileTree) return;
  
  console.log('Processing file changes:', data.changes);
  
  // Process each change incrementally
  let updatedTree = { ...fileTree };
  let treeChanged = false;
  const filesToFetch: string[] = [];
  
  for (const change of data.changes) {
    // Get the parent directory path of the changed file
    const pathParts = change.path.split('/').filter(part => part !== '');
    const fileName = pathParts.pop() || '';
    const parentPath = pathParts.length === 0 ? '/' : '/' + pathParts.join('/');
    
    console.log(`Change type: ${change.type}, path: ${change.path}, parent: ${parentPath}`);
    
    switch (change.type) {
      case 'deleted':
        const afterDelete = removeNodeFromTree(updatedTree, change.path);
        if (afterDelete && afterDelete !== updatedTree) {
          updatedTree = afterDelete;
          treeChanged = true;
          console.log(`Removed node: ${change.path}`);
        }
        break;
        
      case 'added':
        // For added files, we'll request file info
        // Only if the parent directory is in our current view
        if (parentPath === currentPath || 
            parentPath.startsWith(currentPath + '/') ||
            currentPath.startsWith(parentPath + '/')) {
          filesToFetch.push(change.path);
        }
        break;
        
      case 'modified':
        // For modified files, update the node in place if it exists
        const existingNode = findNodeInTree(updatedTree, change.path);
        if (existingNode) {
          const updatedTreeAfterModify = updateNodeInTree(
            updatedTree, 
            change.path, 
            (node) => ({
              ...node,
              modified: new Date().toISOString()
            })
          );
          
          if (updatedTreeAfterModify !== updatedTree) {
            updatedTree = updatedTreeAfterModify;
            treeChanged = true;
            console.log(`Updated modified node: ${change.path}`);
          }
        } else {
          // If we couldn't find the node to update, request its info
          filesToFetch.push(change.path);
        }
        break;
    }
  }
  
  // Update the tree if we made changes
  if (treeChanged) {
    set({ fileTree: updatedTree });
    console.log('Applied incremental updates to the tree');
  }
  
  // Request file info for any new or modified files
  if (filesToFetch.length > 0 && wsConnection && 
      wsConnection.readyState === WebSocket.OPEN) {
    console.log(`Requesting info for ${filesToFetch.length} files`);
    for (const filePath of filesToFetch) {
      wsConnection.send(JSON.stringify({
        type: 'get_file_info',
        path: filePath
      }));
    }
  }
};

// Handle file info message
export const handleFileInfoMessage = (
  data: WebSocketMessage,
  fileTree: FileNode | null,
  currentPath: string,
  wsConnection: WebSocket | null,
  set: (state: Partial<FileExplorerState>) => void
) => {
  if (!data.path || !data.info || !fileTree) return;
  
  console.log('Received file info:', data.path, data.info);
  
  const fileInfo = data.info;
  const newNode: FileNode = {
    id: fileInfo.path,
    name: fileInfo.name,
    path: fileInfo.path,
    type: fileInfo.is_dir ? 'directory' : 'file',
    size: fileInfo.size,
    modified: fileInfo.modified,
    children: fileInfo.is_dir ? [] : undefined
  };
  
  // Check if node already exists in the tree
  const existingNode = findNodeInTree(fileTree, fileInfo.path);
  
  if (existingNode) {
    // Node exists, update it
    console.log('Updating existing node:', fileInfo.path);
    const updatedTree = updateNodeInTree(fileTree, fileInfo.path, () => newNode);
    set({ fileTree: updatedTree });
  } else {
    // Node doesn't exist, add it to the tree
    console.log('Adding new node to tree:', fileInfo.path);
    const updatedTree = addNodeToTree(fileTree, newNode);
    
    if (updatedTree !== fileTree) {
      set({ fileTree: updatedTree });
      console.log('Successfully added new node to tree');
    } else {
      console.warn('Failed to add node to tree - parent directory may not exist:', fileInfo.path);
      
      // If we can't add the node, refresh the entire tree as a fallback
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        console.log('Refreshing entire tree due to failed node addition');
        wsConnection.send(JSON.stringify({
          type: 'get_tree',
          directory: currentPath
        }));
      }
    }
  }
};
