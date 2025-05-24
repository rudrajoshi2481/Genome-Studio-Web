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
      
      set({ fileTree: data, isLoading: false });
      
      // If this is a root level fetch, expand the app directory by default
      if (path === '/app') {
        set((state: State) => ({
          ...state,
          expandedNodes: new Set([...state.expandedNodes, '/app'])
        }));
      }
    } catch (error) {
      console.error('[FileExplorer] Error fetching file tree:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  toggleNode: (nodePath: string) => {
    const expandedNodes = new Set(get().expandedNodes);
    if (expandedNodes.has(nodePath)) {
      expandedNodes.delete(nodePath);
    } else {
      expandedNodes.add(nodePath);
    }
    set({ expandedNodes });
  },

  isNodeExpanded: (nodePath: string) => {
    return get().expandedNodes.has(nodePath);
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
  }
});
