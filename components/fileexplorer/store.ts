  import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createWebSocketService } from '@/lib/websocket';
import type { FileNode } from './types';

type FileEvent = {
  event_type: 'created' | 'modified' | 'deleted';
  path: string;
  is_directory: boolean;
};

type StorageState = {
  expandedNodes: string[];
};

type State = {
  fileTree: FileNode | null;
  expandedNodes: Set<string>;
  isLoading: boolean;
  error: string | null;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  wsError: string | null;
};

type Actions = {
  fetchFileTree: (path: string, depth: number) => Promise<void>;
  toggleNode: (nodePath: string) => void;
  isNodeExpanded: (nodePath: string) => boolean;
  reset: () => void;
  handleFileEvent: (event: FileEvent) => void;
  initializeWebSocket: (path: string) => (() => void) | undefined;
  disconnectWebSocket: () => void;
};

// Initialize WebSocket service (will only be created on client side)
const wsService = createWebSocketService('');

export const useFileExplorerStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      fileTree: null,
      expandedNodes: new Set<string>(),
      isLoading: false,
      error: null,
      wsStatus: 'disconnected',
      wsError: null,

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
            set(state => ({
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

        // For simplicity, we'll just refetch the tree when changes occur
        // In a production environment, you might want to update the tree structure
        // without refetching everything
        get().fetchFileTree('/app', 2);
      },

      initializeWebSocket: (path: string = '/app') => {
        // Only initialize if we're not already connected or if we have an error
        const currentStatus = get().wsStatus;
        if (currentStatus !== 'connected') {
          wsService.disconnect(); // Cleanup any existing connection
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
    }),
    {
      name: 'file-explorer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        expandedNodes: Array.from(state.expandedNodes)
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert the rehydrated array back to a Set
          state.expandedNodes = new Set(state.expandedNodes);
          // Fetch initial data
          state.fetchFileTree('/app', 2);
        }
      }
    }
  )
);
