import { StateCreator } from 'zustand';
import { State, Actions, FileEvent } from './types';
import { FileNode } from '../types';
import { createWebSocketService } from '@/lib/websocket';
import type { WebSocketStatus } from '@/lib/websocket';
import { config, getUrls } from '@/lib/config';

// Initialize WebSocket service (will only be created on client side)
const wsService = createWebSocketService(config.wsUrl);

export const createActions = (
  set: (partial: State | Partial<State> | ((state: State) => State | Partial<State>)) => void,
  get: () => State & Actions
): Actions => ({
  fetchFileTree: async (path: string, depth: number) => {
    try {
      set({ isLoading: true, error: null });
      
      // Import apiRequest function for authenticated requests
      const { apiRequest } = await import('@/lib/api-client');
      
      // Use apiRequest for authenticated API calls
      const data = await apiRequest(
        `${config.fileExplorerEndpoint}?path=${path}&depth=${depth}`,
        { 
          headers: { accept: 'application/json' },
          credentials: 'include', // Include cookies for authentication
          cache: 'no-store' // Disable caching to always get fresh data
        }
      );
      
      // Mark the root node and its immediate children as loaded
      // For directories, we'll only mark them as loaded if they're files or if we've loaded their children
      const markNodesWithLoadedFlag = (node: FileNode, currentDepth: number): FileNode => {
        // Files are always considered loaded
        if (node.type === 'file') {
          return { ...node, isLoaded: true };
        }
        
        // For directories, they're only loaded if we've reached their depth
        const isNodeLoaded = currentDepth < depth;
        
        // Process children recursively if they exist
        const processedChildren = node.children?.map(child => 
          markNodesWithLoadedFlag(child, currentDepth + 1)
        ) || [];
        
        return {
          ...node,
          isLoaded: isNodeLoaded,
          children: processedChildren
        };
      };
      
      // Process the entire tree
      const rootWithLoadedFlag = markNodesWithLoadedFlag(data, 0);
      
      set({ fileTree: rootWithLoadedFlag, isLoading: false, currentPath: path });
      
      // Add this path to recent paths
      get().addToRecentPaths(path);
      
      // We no longer automatically expand any directories by default
      // All folders will remain closed until the user explicitly opens them
    } catch (error) {
      console.error('[FileExplorer] Error fetching file tree:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  fetchDirectoryContents: async (path: string) => {
    try {
      // First mark the node as loading
      const loadingUpdate = { isLoading: true };
      get().updateNodeInTree(path, loadingUpdate);
      
      // Import apiRequest function for authenticated requests
      const { apiRequest } = await import('@/lib/api-client');
      
      // Use apiRequest for authenticated API calls
      const data = await apiRequest(
        `${config.apiUrl}/api/directory/contents?path=${path}`,
        { 
          headers: { accept: 'application/json' },
          credentials: 'include', // Include cookies for authentication
          cache: 'no-store' // Disable caching to always get fresh data
        }
      );
      
      // Mark all children as loaded if they are files, or not loaded if they are directories
      const updatedNode = {
        ...data,
        isLoaded: true,
        isLoading: false,
        children: data.children?.map((child: FileNode) => ({
          ...child,
          isLoaded: child.type === 'file',
          children: child.children || []
        })) || []
      };
      
      // Update the node in the tree
      get().updateNodeInTree(path, updatedNode);
      
    } catch (error) {
      console.error('[FileExplorer] Error fetching directory contents:', error);
      // Mark the node as not loading anymore
      const notLoadingUpdate = { isLoading: false };
      get().updateNodeInTree(path, notLoadingUpdate);
    }
  },

  toggleNode: async (nodePath: string) => {
    const expandedNodes = new Set(get().expandedNodes);
    const isExpanding = !expandedNodes.has(nodePath);
    
    // Import the directory watcher utilities
    const { watchDirectory, unwatchDirectory } = await import('../utils/directoryWatcher');
    
    if (isExpanding) {
      // Add to expanded nodes
      expandedNodes.add(nodePath);
      
      // Start watching this directory when expanded
      watchDirectory(nodePath);
      
      // Check if the node is already loaded
      if (!get().isNodeLoaded(nodePath)) {
        // Fetch directory contents if not loaded
        get().fetchDirectoryContents(nodePath);
      }
    } else {
      // Remove from expanded nodes
      expandedNodes.delete(nodePath);
      
      // Stop watching this directory when collapsed
      unwatchDirectory(nodePath);
    }
    
    set({ expandedNodes });
  },
  
  collapseAll: async () => {
    // Get the current expanded nodes
    const expandedNodes = get().expandedNodes;
    
    if (expandedNodes.size === 0) {
      return; // Nothing to collapse
    }
    
    // Import the directory watcher utilities
    const { unwatchDirectory } = await import('../utils/directoryWatcher');
    
    // Unwatch all expanded directories
    const unwatchPromises = Array.from(expandedNodes).map(path => unwatchDirectory(path));
    await Promise.all(unwatchPromises);
    
    // Clear all expanded nodes
    set({ expandedNodes: new Set() });
    
    console.log('[FileExplorer] Collapsed all directories');
  },

  isNodeExpanded: (nodePath: string) => {
    return get().expandedNodes.has(nodePath);
  },
  
  isNodeLoaded: (nodePath: string) => {
    // Helper function to find a node by path
    const findNode = (node: FileNode | null, path: string): FileNode | null => {
      if (!node) return null;
      if (node.path === path) return node;
      
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, path);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    const node = findNode(get().fileTree, nodePath);
    return node?.isLoaded || false;
  },
  
  // This function updates only specific properties of a node without requiring a complete FileNode object
  updateNodeInTree: (nodePath: string, updates: { isLoaded?: boolean; isLoading?: boolean }) => {
    set((state: State) => {
      if (!state.fileTree) return state;
      
      // Helper function to update a node in the tree
      const updateNode = (node: FileNode, path: string): FileNode => {
        if (node.path === path) {
          // Merge the updates with the existing node
          return { ...node, ...updates };
        }
        
        if (node.children) {
          return {
            ...node,
            children: node.children.map(child => updateNode(child, path))
          };
        }
        
        return node;
      };
      
      return {
        ...state,
        fileTree: updateNode(state.fileTree, nodePath)
      };
    });
  },

  createFile: async (directoryPath: string, fileName: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Import apiRequest function for authenticated requests
      const { apiRequest } = await import('@/lib/api-client');
      const { config } = await import('@/lib/config');
      
      // Use apiRequest for authenticated API calls
      const response = await apiRequest(
        `${config.apiUrl}/api/file-operations/create-file`,
        { 
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            path: directoryPath,
            name: fileName
          })
        }
      );
      
      // Refresh the directory contents
      await get().fetchDirectoryContents(directoryPath);
      
      set({ isLoading: false });
      return response;
    } catch (error) {
      console.error('[FileExplorer] Error creating file:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  createFolder: async (directoryPath: string, folderName: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Import apiRequest function for authenticated requests
      const { apiRequest } = await import('@/lib/api-client');
      const { config } = await import('@/lib/config');
      
      // Use apiRequest for authenticated API calls
      const response = await apiRequest(
        `${config.apiUrl}/api/file-operations/create-folder`,
        { 
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            path: directoryPath,
            name: folderName
          })
        }
      );
      
      // Refresh the directory contents
      await get().fetchDirectoryContents(directoryPath);
      
      set({ isLoading: false });
      return response;
    } catch (error) {
      console.error('[FileExplorer] Error creating folder:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  deleteItem: async (itemPath: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Get the parent directory path to refresh after deletion
      const parentPath = itemPath.substring(0, itemPath.lastIndexOf('/'));
      
      // Import apiRequest function for authenticated requests
      const { apiRequest } = await import('@/lib/api-client');
      const { config } = await import('@/lib/config');
      
      // Use apiRequest for authenticated API calls
      const response = await apiRequest(
        `${config.apiUrl}/api/file-operations/delete`,
        { 
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            path: itemPath
          })
        }
      );
      
      // Refresh the directory contents of the parent directory
      await get().fetchDirectoryContents(parentPath);
      
      set({ isLoading: false });
      return response;
    } catch (error) {
      console.error('[FileExplorer] Error deleting item:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set({ fileTree: null, expandedNodes: new Set(), error: null });
  },

  handleFileEvent: (event: FileEvent) => {
    const currentTree = get().fileTree;
    if (!currentTree) return;

    // console.log('[FileWatch] Handling file event:', event);

    // Update tree structure based on the operation type
    switch (event.operation) {
      case 'created':
      case 'modified': {
        if (!event.node) {
          // console.error('[FileWatch] Missing node data for create/modify operation');
          return;
        }

        // For create/modify, we need to find the parent directory of the new/modified node
        const nodePath = event.node.path;
        const parentPath = nodePath.substring(0, nodePath.lastIndexOf('/'));

        // console.log('[FileWatch] Adding/updating node:', {
        //   nodePath,
        //   parentPath,
        //   nodeDetails: event.node
        // });

        set((state: State) => {
          const updateTree = (node: FileNode): FileNode => {
            // If this is the parent directory where we need to add/update the node
            if (node.path === parentPath) {
              const existingNodeIndex = node.children?.findIndex(child => child.path === nodePath) ?? -1;
              
              if (existingNodeIndex === -1) {
                // Node doesn't exist, add it
                // console.log('[FileWatch] Adding new node to', node.path);
                return {
                  ...node,
                  children: [...(node.children || []), event.node!]
                };
              } else {
                // Node exists, update it
                // console.log('[FileWatch] Updating existing node in', node.path);
                return {
                  ...node,
                  children: node.children!.map((child, index) => 
                    index === existingNodeIndex ? event.node! : child
                  )
                };
              }
            }
            
            // Continue traversing if this node has children
            if (node.children) {
              return {
                ...node,
                children: node.children.map(child => updateTree(child))
              };
            }
            return node;
          };
          
          const updatedTree = updateTree(currentTree);
          return { ...state, fileTree: updatedTree };
        });
        break;
      }

      case 'deleted': {
        const pathToDelete = event.path;
        // console.log('[FileWatch] Processing delete for path:', pathToDelete);

        set((state: State) => {
          const parentPath = pathToDelete.substring(0, pathToDelete.lastIndexOf('/'));
          // console.log('[FileWatch] Will look for parent path:', parentPath);
          
          const updateTree = (node: FileNode): FileNode => {
            // If this is the parent directory where we need to remove the node
            if (node.path === parentPath && node.children) {
              // console.log('[FileWatch] Found parent node:', node.path, 'children before:', node.children.length);
              const updatedChildren = node.children.filter(child => child.path !== pathToDelete);
              // console.log('[FileWatch] Children after filter:', updatedChildren.length);
              
              return {
                ...node,
                children: updatedChildren
              };
            }
            
            // Continue traversing if this node has children
            if (node.children) {
              const updatedChildren = node.children.map(child => updateTree(child));
              return {
                ...node,
                children: updatedChildren
              };
            }
            
            return node;
          };
          
          const updatedTree = updateTree(currentTree);
          // console.log('[FileWatch] Tree updated after deletion');
          return { ...state, fileTree: updatedTree };
        });
        break;
      }
    }
  },

  initializeWebSocket: (path: string = '/app') => {
    const currentStatus = get().wsStatus;
    // Always reconnect to ensure a fresh connection
    wsService.disconnect();
    console.log('[FileExplorer] Initializing WebSocket connection for path:', path);
    wsService.connect(path);
    
    // Start watching the root directory
    import('../utils/directoryWatcher').then(({ watchDirectory }) => {
      watchDirectory(path);
    });

    const subscription = wsService.subscribe({
      onMessage: (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[FileExplorer] Received WebSocket message:', data.type);
          
          if (data.type === 'directory_update') {
            // Handle full directory updates
            set({ fileTree: data.data });
            console.log('[FileExplorer] Updated file tree with directory update');
          } else if (data.type === 'partial_update') {
            // Handle new partial update format
            console.log('[FileExplorer] Processing partial update:', data.operation, data.path);
            get().handleFileEvent({
              type: 'partial_update',
              operation: data.operation,
              path: data.path,
              node: data.node
            });
          } else if (data.type === 'file_event') {
            // Handle old file event format
            const eventType = data.data.event_type;
            console.log('[FileExplorer] Processing file event:', eventType, data.data.path);
            get().handleFileEvent({
              type: 'partial_update',
              operation: eventType,
              path: data.data.path,
              node: eventType !== 'deleted' ? {
                name: data.data.path.split('/').pop() || '',
                path: data.data.path,
                type: data.data.is_directory ? 'directory' : 'file',
                is_directory: data.data.is_directory,
                size: 0,
                modified: new Date().toISOString(),
                children: data.data.is_directory ? [] : undefined
              } : undefined
            });
          } else if (data.type === 'heartbeat') {
            // Just a heartbeat, no action needed
            console.log('[FileExplorer] Received heartbeat');
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      },
      onError: (error: Error) => {
        console.error('[FileExplorer] WebSocket error:', error.message);
        set({ wsError: error.message, wsStatus: 'error' });
      },
      onStatusChange: (status: WebSocketStatus) => {
        console.log('[FileExplorer] WebSocket status changed:', status);
        const currentStatus = get().wsStatus;
        if (currentStatus !== status) {
          set({ wsStatus: status });
        }
      }
    });

    return () => subscription.unsubscribe();
  },

  disconnectWebSocket: () => {
    wsService.disconnect();
    set({ wsStatus: 'disconnected' });
  },

  // Navigation actions
  navigateToPath: (path: string) => {
    const { navigationHistory, currentPath } = get();
    
    // Don't navigate if it's the same path
    if (path === currentPath) return;
    
    // Create a new navigation history by removing any forward history
    const newPaths = [
      ...navigationHistory.paths.slice(0, navigationHistory.currentIndex + 1),
      path
    ];
    const newIndex = newPaths.length - 1;
    
    set({
      currentPath: path,
      navigationHistory: {
        paths: newPaths,
        currentIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: false
      }
    });
    
    // Fetch the file tree for the new path
    get().fetchFileTree(path, 3);
  },
  
  navigateBack: () => {
    const { navigationHistory } = get();
    
    if (!navigationHistory.canGoBack) return;
    
    const newIndex = navigationHistory.currentIndex - 1;
    const path = navigationHistory.paths[newIndex];
    
    set({
      currentPath: path,
      navigationHistory: {
        ...navigationHistory,
        currentIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: true
      }
    });
    
    // Fetch the file tree for the new path
    get().fetchFileTree(path, 3);
  },
  
  navigateForward: () => {
    const { navigationHistory } = get();
    
    if (!navigationHistory.canGoForward) return;
    
    const newIndex = navigationHistory.currentIndex + 1;
    const path = navigationHistory.paths[newIndex];
    
    set({
      currentPath: path,
      navigationHistory: {
        ...navigationHistory,
        currentIndex: newIndex,
        canGoBack: true,
        canGoForward: newIndex < navigationHistory.paths.length - 1
      }
    });
    
    // Fetch the file tree for the new path
    get().fetchFileTree(path, 3);
  },
  
  addToRecentPaths: (path: string) => {
    set((state: State) => {
      // Add to recent paths, remove duplicates, and keep only the last 10
      const recentPaths = [path, ...state.recentPaths.filter(p => p !== path)].slice(0, 10);
      return { recentPaths };
    });
  }
});
