import { StateCreator } from 'zustand';
import { State, Actions, FileEvent } from './types';
import { FileNode } from '../types';
import { createWebSocketService } from '@/lib/websocket';

// Initialize WebSocket service (will only be created on client side)
const wsService = createWebSocketService('');

export const createActions = (
  set: (partial: State | Partial<State> | ((state: State) => State | Partial<State>)) => void,
  get: () => State & Actions
): Actions => ({
  fetchFileTree: async (path: string, depth: number) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(
        `http://localhost:8000/api/files?path=${encodeURIComponent(path)}&depth=${depth}`,
        { 
          headers: { accept: 'application/json' },
          cache: 'no-store' // Disable caching to always get fresh data
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch file tree');
      }
      
      const data = await response.json();
      set({ fileTree: data, isLoading: false });
      
      // If this is a root level fetch, expand the app directory by default
      if (path === '/app') {
        set((state: State) => ({
          ...state,
          expandedNodes: new Set([...state.expandedNodes, '/app'])
        }));
      }
    } catch (error) {
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

    // Update tree structure based on the event type
    switch (event.event_type) {
      case 'created': {
        // Find parent directory and add new node
        const parentPath = event.path.substring(0, event.path.lastIndexOf('/'));
        const fileName = event.path.substring(event.path.lastIndexOf('/') + 1);

        set((state: State) => {
          const updateTree = (node: FileNode): FileNode => {
            if (node.path === parentPath) {
              // Add new node to parent's children
              const newNode: FileNode = {
                name: fileName,
                path: event.path,
                type: event.is_directory ? 'directory' : 'file',
                is_directory: event.is_directory,
                size: 0,
                modified: new Date().toISOString(),
                children: event.is_directory ? [] : undefined
              };
              
              // Check if node already exists to avoid duplicates
              const exists = node.children?.some(child => child.path === event.path);
              if (!exists) {
                return {
                  ...node,
                  children: [...(node.children || []), newNode]
                };
              }
            }
            
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

      case 'modified':
        // No need to update tree structure for modifications
        break;

      case 'deleted': {
        set((state: State) => {
          const updateTree = (node: FileNode): FileNode => {
            if (node.children) {
              return {
                ...node,
                children: node.children
                  .filter(child => child.path !== event.path)
                  .map(child => updateTree(child))
              };
            }
            return node;
          };
          
          const updatedTree = updateTree(currentTree);
          return { ...state, fileTree: updatedTree };
        });
        break;
      }
    }
  },

  initializeWebSocket: (path: string = '/app') => {
    // Only initialize if we're not already connected or if we have an error
    const currentStatus = get().wsStatus;
    if (currentStatus !== 'connected') {
      wsService.disconnect(); // Cleanup any existing connection
      
      // Connect to the WebSocket with the path parameter
      wsService.connect(path);

      return wsService.subscribe({
        onMessage: (event: MessageEvent) => {
          try {
            const fileEvent = JSON.parse(event.data) as FileEvent;
            get().handleFileEvent(fileEvent);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        },
        onError: (error) => {
          set({ wsError: error.message, wsStatus: 'error' });
        },
        onStatusChange: (status) => {
          // Only update status if it's different
          const currentStatus = get().wsStatus;
          if (currentStatus !== status) {
            set({ wsStatus: status });
          }
        }
      });
    }
    // Return no-op if already connected
    return () => {};
  },

  disconnectWebSocket: () => {
    wsService.disconnect();
    set({ wsStatus: 'disconnected' });
  }
});
