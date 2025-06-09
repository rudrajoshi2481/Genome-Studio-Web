"use client";

import { create } from 'zustand';

// Define WebSocket connection status
type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Define the file node structure
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
  children?: FileNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

// Root node type with guaranteed children array
export interface RootFileNode extends FileNode {
  children: FileNode[];
}

interface FileExplorerState {
  // File tree structure
  fileTree: RootFileNode;
  selectedNode: string | null; // Using string ID instead of the node object
  rootPath: string;
  currentPath: string;
  isLoading: boolean;
  error: string | null;
  wsStatus: WebSocketStatus;
  
  // Actions
  setFileTree: (fileTree: RootFileNode) => void;
  setSelectedNode: (node: FileNode | null) => void;
  setRootPath: (path: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Node operations
  toggleNode: (nodeId: string) => void;
  isNodeExpanded: (nodeId: string) => boolean;
  selectNode: (nodeId: string) => void;
  
  // Navigation
  navigateToPath: (path: string) => void;
  
  // WebSocket operations
  connectWebSocket: (path: string) => void;
  disconnectWebSocket: () => void;
  
  // Refresh operations
  refreshFileTree: () => Promise<void>;
}

export const useFileExplorerStore = create<FileExplorerState>((set, get) => ({
  fileTree: {
    id: 'root',
    name: 'root',
    path: '',
    type: 'directory',
    children: []
  },
  selectedNode: null,
  rootPath: '',
  currentPath: '',
  isLoading: false,
  error: null,
  wsStatus: 'disconnected',
  
  setFileTree: (fileTree: RootFileNode) => set({ fileTree }),
  setSelectedNode: (node) => set({ selectedNode: node ? node.id : null }),
  setRootPath: (path) => set({ rootPath: path }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Node operations
  toggleNode: (nodeId) => {
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    
    set(state => ({
      fileTree: {
        ...state.fileTree,
        children: updateNodes(state.fileTree.children)
      }
    }));
  },
  
  isNodeExpanded: (nodeId) => {
    const findNode = (nodes: FileNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return !!node.isExpanded;
        }
        if (node.children && node.children.length > 0) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return false;
    };
    
    return findNode(get().fileTree.children);
  },
  
  selectNode: (nodeId) => {
    set({ selectedNode: nodeId });
  },
  
  // Navigation
  navigateToPath: (path) => {
    set({ currentPath: path });
    get().refreshFileTree();
  },
  
  // WebSocket operations
  connectWebSocket: (path) => {
    set({ wsStatus: 'connecting', currentPath: path });
    
    // Simulate WebSocket connection
    setTimeout(() => {
      set({ wsStatus: 'connected' });
      get().refreshFileTree();
    }, 500);
  },
  
  disconnectWebSocket: () => {
    set({ wsStatus: 'disconnected' });
  },
  
  // Refresh operations
  refreshFileTree: async () => {
    const { currentPath } = get();
    if (!currentPath) return;
    
    set({ isLoading: true, error: null });
    
    try {
      // Here you would typically make an API call to fetch the file structure
      // For now, we'll just simulate a delay and create a mock file structure
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock file structure
      const rootNode: RootFileNode = {
        id: 'root',
        name: currentPath.split('/').pop() || 'root',
        path: currentPath,
        type: 'directory',
        children: [
          {
            id: 'dir1',
            name: 'src',
            path: `${currentPath}/src`,
            type: 'directory',
            children: [
              {
                id: 'file1',
                name: 'index.js',
                path: `${currentPath}/src/index.js`,
                type: 'file',
                size: 1024,
                lastModified: new Date().toISOString()
              },
              {
                id: 'file2',
                name: 'app.js',
                path: `${currentPath}/src/app.js`,
                type: 'file',
                size: 2048,
                lastModified: new Date().toISOString()
              }
            ]
          },
          {
            id: 'dir2',
            name: 'public',
            path: `${currentPath}/public`,
            type: 'directory',
            children: [
              {
                id: 'file3',
                name: 'index.html',
                path: `${currentPath}/public/index.html`,
                type: 'file',
                size: 512,
                lastModified: new Date().toISOString()
              }
            ]
          }
        ]
      };
      
      set({ fileTree: rootNode, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh file tree' 
      });
    }
  }
}));