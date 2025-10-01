/**
 * Robust File Explorer Store with Direct Tree Manipulation
 * Based on the original FileExplorer class logic for reliable real-time updates
 */

import { toast } from 'sonner';
import { create } from 'zustand';
import { useAuthStore } from '@/lib/stores/auth-store';
import * as authService from '@/lib/services/auth-service';
import { fileExplorerApi } from '../services/api';
import { host, port } from '@/config/server';
import { useTabStore } from '@/components/FileTabs/useTabStore';

// Import helper functions for upload conflict handling
const buildUrl = (endpoint: string) => {
  const host = window.location.hostname;
  const port = window.location.port || '8000';
  return `http://${host}:${port}/api/v1/file-explorer-new${endpoint}`;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = authService.getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// FileNode interface (compatible with API types)
interface FileNode {
  path: string;
  name: string;
  is_dir: boolean;
  size?: number;
  modified?: string;
  children?: FileNode[];
  parent?: string | null;
  expanded?: boolean;
  selected?: boolean;
  active?: boolean;
}

// File system change event type
interface FileSystemChangeEvent {
  change_type: 'created' | 'deleted' | 'modified';
  path: string;
  is_dir: boolean;
  timestamp: string;
}

interface FileExplorerState {
  rootPath: string;
  fileTree: FileNode | null;
  nodes: Map<string, FileNode>;
  selectedPaths: string[];
  expandedPaths: string[];
  activePath: string | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastTreeUpdate: number;
  lastProcessedEvents: Set<string>;
  ws?: WebSocket;
  searchQuery: string;
  searchResults: FileNode[];
  isSearching: boolean;
  isSubscribed: boolean;
  // Clipboard state for cut/copy operations
  clipboard: {
    items: string[];
    operation: 'cut' | 'copy' | null;
  };
}

interface FileExplorerStore extends FileExplorerState {
  // Actions
  setRootPath: (path: string) => void;
  loadFileTree: (forceFresh?: boolean) => Promise<void>;
  refreshFileTree: (force?: boolean) => Promise<void>;
  initializeTree: (rootNode: FileNode) => void;
  toggleNode: (path: string) => void;
  loadNodeChildren: (path: string) => Promise<void>;
  selectNode: (path: string, multiSelect?: boolean) => void;
  setActivePath: (path: string) => void;
  isNodeExpanded: (path: string) => boolean;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  subscribeToFileChanges: () => void;
  unsubscribeFromFileChanges: () => void;
  updateTreeNode: (event: FileSystemChangeEvent) => void;
  collapseAll: () => void;
  expandToPath: (path: string) => void;
  search: (query: string) => FileNode[];
  searchFiles: (query: string) => Promise<void>;
  clearSearch: () => void;
  createFile: (name: string, parentPath?: string) => Promise<void>;
  createDirectory: (name: string, parentPath?: string) => Promise<void>;
  deleteItems: (paths: string[]) => Promise<void>;
  renameItem: (oldPath: string, newName: string) => Promise<void>;
  duplicateItem: (sourcePath: string, destinationPath: string) => Promise<void>;
  uploadFiles: (files: File[], targetPath: string) => Promise<void>;
  downloadFile: (path: string) => Promise<void>;
  clearError: () => void;
  // Clipboard operations
  cutItems: (paths: string[]) => void;
  copyItems: (paths: string[]) => void;
  pasteItems: (targetPath: string) => Promise<void>;
  canPaste: () => boolean;
}

// Helper function to get auth token
const getToken = (): string => {
  return authService.getToken() || '';
};

// Tree manipulation utilities inspired by original FileExplorer class
function isVimTempFile(path: string): boolean {
  return path.endsWith('/4913') || 
         path === '4913' || 
         path.includes('.swp') || 
         path.includes('.swx') || 
         path.endsWith('~');
}

function sortNodeChildren(node: FileNode): void {
  if (node.children) {
    node.children.sort((a, b) => {
      // If one is a directory and the other isn't, directories come first
      if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
      }
      // Otherwise sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }
}

function findNodeInTree(tree: FileNode | null, targetPath: string): FileNode | null {
  if (!tree) return null;
  
  if (tree.path === targetPath) {
    return tree;
  }
  
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeInTree(child, targetPath);
      if (found) return found;
    }
  }
  
  return null;
}

function removeNodeFromTree(tree: FileNode, targetPath: string): boolean {
  console.log(`🗑️ removeNodeFromTree: searching for ${targetPath}`);
  
  if (!tree.children) {
    return false;
  }
  
  // Check if any direct child matches the target path
  const childIndex = tree.children.findIndex(child => child.path === targetPath);
  if (childIndex !== -1) {
    console.log(`🗑️ Found target node at index ${childIndex}, removing: ${targetPath}`);
    tree.children.splice(childIndex, 1);
    return true;
  }
  
  // Recursively search in subdirectories
  for (const child of tree.children) {
    if (child.is_dir && child.children && targetPath.startsWith(child.path + '/')) {
      if (removeNodeFromTree(child, targetPath)) {
        return true;
      }
    }
  }
  
  return false;
}

function addNodeToTree(tree: FileNode, targetPath: string, isDir: boolean): boolean {
  console.log(`➕ addNodeToTree: adding ${targetPath} (isDir: ${isDir})`);
  
  // Get parent directory path
  const pathParts = targetPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const parentPath = pathParts.slice(0, -1).join('/') || '/';
  
  // Find parent node
  const parentNode = findNodeInTree(tree, parentPath);
  if (!parentNode) {
    console.log(`⚠️ Parent node not found: ${parentPath}`);
    return false;
  }
  
  // Check if node already exists
  if (parentNode.children?.some(child => child.path === targetPath)) {
    console.log(`⚠️ Node already exists: ${targetPath}`);
    return false;
  }
  
  // Create new node
  const newNode: FileNode = {
    path: targetPath,
    name: fileName,
    is_dir: isDir,
    size: 0,
    modified: new Date().toISOString(),
    children: isDir ? [] : undefined,
    parent: parentPath,
    expanded: false,
    selected: false,
    active: false
  };
  
  // Add to parent's children
  if (!parentNode.children) {
    parentNode.children = [];
  }
  
  parentNode.children.push(newNode);
  sortNodeChildren(parentNode);
  
  console.log(`✅ Added node to tree: ${targetPath}`);
  return true;
}

function updateNodeInTree(tree: FileNode, targetPath: string): boolean {
  const node = findNodeInTree(tree, targetPath);
  if (node) {
    node.modified = new Date().toISOString();
    console.log(`✅ Updated node in tree: ${targetPath}`);
    return true;
  }
  
  console.log(`⚠️ Node not found for update: ${targetPath}`);
  return false;
}

export const useFileExplorerStore = create<FileExplorerStore>()((set: any, get: any) => {
  // Initialize localStorage with default root path if not set (only in browser)
  if (typeof window !== 'undefined') {
    try {
      const storedRootPath = localStorage.getItem('fileExplorer_rootPath');
      if (!storedRootPath) {
        localStorage.setItem('fileExplorer_rootPath', '/home');
      }
    } catch (error) {
      console.warn('Failed to initialize root path in localStorage:', error);
    }
  }

  return {
  // Initialize with empty state
  fileTree: null,
  nodes: new Map(),
  rootPath: '/home', // Default to /home, but will be set dynamically
  selectedPaths: [],
  expandedPaths: [],
  activePath: null,
  isLoading: false,
  error: null,
  isConnected: false,
  wsStatus: 'disconnected',
  lastTreeUpdate: 0,
  lastProcessedEvents: new Set(),
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  isSubscribed: false,
  clipboard: {
    items: [],
    operation: null,
  },

  // Actions
  setRootPath: (path: string) => {
    console.log(`🌳 Setting root path from ${get().rootPath} to ${path}`);
    const state = get();
    
    // Save to localStorage for API service access (only in browser)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fileExplorer_rootPath', path);
      } catch (error) {
        console.warn('Failed to save root path to localStorage:', error);
      }
    }
    
    // Clear existing state if changing root path
    if (state.rootPath !== path && state.nodes.size > 0) {
      state.nodes.clear();
      state.selectedPaths = [];
      state.expandedPaths = [];
      set({
        rootPath: path,
        fileTree: null,
        activePath: null,
        lastTreeUpdate: Date.now()
      });
    } else {
      set({ rootPath: path });
    }
  },

  loadFileTree: async (forceFresh = false) => {
    const { rootPath } = get();
    console.log(`🌳 Loading file tree for root path: ${rootPath}`, { forceFresh });
    
    try {
      // Use the API service with forceRefresh parameter
      console.log('🌐 Fetching tree data via API service with forceRefresh:', forceFresh);
      
      const treeResponse = await fileExplorerApi.getFileTree(rootPath, forceFresh);
      
      if (!treeResponse || !treeResponse.tree) {
        throw new Error('Invalid response from file tree API');
      }
      
      console.log('🌳 File tree loaded successfully:', treeResponse);
      console.log('📊 Tree stats - Files:', treeResponse.total_files, 'Directories:', treeResponse.total_directories);
      
      // Initialize tree using the new logic
      get().initializeTree(treeResponse.tree);
      
    } catch (error) {
      console.error('❌ Failed to load file tree:', error);
    }
  },

  initializeTree: (rootNode: FileNode) => {
    const state = get();
    console.log('🌳 Initializing tree with root node:', rootNode.path);
    
    // Save expanded paths before clearing
    const savedExpandedPaths = [...state.expandedPaths];
    console.log('💾 Saving expanded paths during tree init:', savedExpandedPaths);
    
    // Clear existing state but preserve expanded paths
    state.nodes.clear();
    state.selectedPaths = [];
    // DON'T clear expandedPaths - keep them for refresh
    
    // Build tree recursively and populate hash map (inspired by original FileExplorer)
    const buildTreeFromNode = (node: FileNode, parentPath: string | null): void => {
      // Skip Vim temporary files like '4913'
      if (isVimTempFile(node.path)) {
        console.log(`Skipping Vim temporary file: ${node.path}`);
        return;
      }
      
      const processedNode: FileNode = {
        ...node,
        parent: parentPath,
        expanded: false,
        selected: false,
        active: false
      };

      state.nodes.set(node.path, processedNode);

      if (node.children) {
        for (const child of node.children) {
          buildTreeFromNode(child, node.path);
        }
      }
    };
    
    buildTreeFromNode(rootNode, null);
    
    // Restore expanded paths or set initial if empty
    if (savedExpandedPaths.length > 0) {
      // Restore saved expanded paths
      state.expandedPaths = savedExpandedPaths;
      console.log('✓ Restored expanded paths:', savedExpandedPaths);
    } else {
      // First load - expand root by default
      state.expandedPaths = [rootNode.path];
      console.log('✓ Set initial expanded path:', rootNode.path);
    }
    
    // Update state
    set({ 
      fileTree: rootNode,
      lastTreeUpdate: Date.now()
    });
    
    console.log(`🌳 Tree initialized with ${state.nodes.size} nodes`);
    console.log(`📂 Expanded paths after init: ${state.expandedPaths.length} folders`);
  },

  toggleNode: (path: string) => {
    console.log(`🔄 Toggling node expansion for: ${path}`);
    const state = get();
    const newExpandedPaths = [...state.expandedPaths];
    
    if (newExpandedPaths.includes(path)) {
      console.log(`📁 Collapsing node: ${path}`);
      newExpandedPaths.splice(newExpandedPaths.indexOf(path), 1);
    } else {
      console.log(`📂 Expanding node: ${path}`);
      newExpandedPaths.push(path);
      
      // Lazy load children if not already loaded or if it's a directory that might have more
      const node = state.nodes.get(path);
      if (node?.is_dir) {
        // Always try to load if children is undefined, null, or empty array
        const shouldLoad = !node.children || node.children.length === 0;
        if (shouldLoad) {
          console.log(`🔍 Lazy loading children for: ${path} (has ${node.children?.length || 0} children)`);
          get().loadNodeChildren(path);
        } else {
          console.log(`✓ Node already has ${node.children.length} children loaded`);
        }
      }
    }
    
    set({ 
      expandedPaths: newExpandedPaths,
      lastTreeUpdate: Date.now()
    });
  },

  loadNodeChildren: async (path: string) => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          STORE: PROCESSING LAZY LOADED CHILDREN                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('📂 Target Path:', path);
    
    try {
      const state = get();
      const nodesBefore = state.nodes.size;
      
      console.log('📊 Store State Before:');
      console.log('  - Total nodes in map:', nodesBefore);
      console.log('  - Expanded paths:', state.expandedPaths.length);
      
      const node = state.nodes.get(path);
      
      if (!node) {
        console.error('❌ ERROR: Node not found in store');
        console.error('   Path:', path);
        console.error('   Available nodes:', Array.from(state.nodes.keys()).filter(k => k.includes('routes')));
        return;
      }
      
      if (!node.is_dir) {
        console.error('❌ ERROR: Node is not a directory');
        console.error('   Path:', path);
        console.error('   Node type:', node.is_dir ? 'directory' : 'file');
        return;
      }
      
      console.log('✓ Node found in store');
      console.log('  - Current children:', node.children?.length || 0);
      
      // Call API to fetch children
      console.log('');
      console.log('⏳ Calling API to fetch children...');
      const children = await fileExplorerApi.loadDirectoryChildren(path);
      
      console.log('');
      console.log('🔧 UPDATING TREE STRUCTURE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📝 Received ${children.length} children from API`);
      
      // Create a NEW node object with children (don't mutate)
      const updatedNode = { ...node, children };
      console.log('✓ Created new node object with children array');
      
      // Add children to nodes map recursively
      let addedCount = 0;
      const newNodesMap = new Map(state.nodes);
      
      const addToNodesMap = (items: FileNode[], level = 0) => {
        items.forEach((child: FileNode) => {
          const indent = '  '.repeat(level);
          const icon = child.is_dir ? '📁' : '📄';
          console.log(`${indent}➕ ${icon} ${child.name}`);
          console.log(`${indent}   Path: ${child.path}`);
          newNodesMap.set(child.path, child);
          addedCount++;
          
          if (child.children && child.children.length > 0) {
            console.log(`${indent}   └─ Has ${child.children.length} nested children`);
            addToNodesMap(child.children, level + 1);
          }
        });
      };
      
      console.log('');
      console.log('📋 Adding children to nodes map:');
      addToNodesMap(children);
      
      // Update the parent node in the map with the new node object
      newNodesMap.set(path, updatedNode);
      
      const nodesAfter = newNodesMap.size;
      
      console.log('');
      console.log('📊 Store State After:');
      console.log('  - Nodes added:', addedCount);
      console.log('  - Total nodes before:', nodesBefore);
      console.log('  - Total nodes after:', nodesAfter);
      console.log('  - Net increase:', nodesAfter - nodesBefore);
      
      // Recursively update the tree structure
      const updateTreeNode = (treeNode: FileNode): FileNode => {
        if (treeNode.path === path) {
          return updatedNode;
        }
        if (treeNode.children) {
          return {
            ...treeNode,
            children: treeNode.children.map(updateTreeNode)
          };
        }
        return treeNode;
      };
      
      const newFileTree = state.fileTree ? updateTreeNode(state.fileTree) : null;
      
      // Force update the tree with new objects
      console.log('');
      console.log('🔄 Triggering React re-render with new tree structure...');
      set({
        fileTree: newFileTree,
        nodes: newNodesMap,
        lastTreeUpdate: Date.now()
      });
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║          ✅ LAZY LOADING COMPLETED SUCCESSFULLY                    ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝');
      console.log(`✓ ${children.length} children loaded for: ${path}`);
      console.log(`✓ Tree updated with ${addedCount} new nodes`);
      console.log('');
      
    } catch (error) {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║          ❌ LAZY LOADING FAILED                                    ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝');
      console.error('💥 Error:', error);
      console.error('📂 Path:', path);
      console.log('');
      toast.error(`Failed to load folder contents`);
    }
  },

  selectNode: (path: string, multiSelect = false) => {
    // Skip Vim temporary files
    if (isVimTempFile(path)) {
      console.log(`Preventing selection of Vim temporary file: ${path}`);
      return;
    }
    
    const state = get();
    let newSelectedPaths = [...state.selectedPaths];
    
    if (multiSelect) {
      if (newSelectedPaths.includes(path)) {
        newSelectedPaths.splice(newSelectedPaths.indexOf(path), 1);
      } else {
        newSelectedPaths.push(path);
      }
    } else {
      newSelectedPaths = [path];
    }
    
    // Get the node to check if it's a directory
    const node = state.nodes.get(path);
    if (node?.is_dir) {
      console.log('Active folder:', { path, name: node.name });
    }
    
    set({ 
      selectedPaths: newSelectedPaths,
      activePath: path,
      lastTreeUpdate: Date.now()
    });
  },

  setActivePath: (path: string) => {
    const state = get();
    const node = state.nodes.get(path);
    
    console.log('Set active path:', { path, isDirectory: node?.is_dir, name: node?.name });
    if (node?.is_dir) {
      console.log('Active folder:', { path, name: node.name });
    }
    
    set({ 
      activePath: path,
      lastTreeUpdate: Date.now()
    });
  },

  isNodeExpanded: (path: string) => {
    return get().expandedPaths.includes(path);
  },

  connectWebSocket: () => {
    console.log('🔌 Connecting WebSocket for file changes...');
    
    const { rootPath } = get();
    const token = getToken();
    const wsUrl = `ws://${host}:${port}/api/v1/file-explorer-new/ws/file-sync?token=${encodeURIComponent(token)}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('🔌 WebSocket connected successfully');
        
        // Send root path to start watching
        ws.send(JSON.stringify({
          type: 'set_root_path',
          root_path: rootPath
        }));
        
        set({ 
          isConnected: true,
          wsStatus: 'connected',
          lastTreeUpdate: Date.now()
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📡 Received WebSocket message:', message);
          
          if (message.type === 'file_system_change') {
            const eventKey = `${message.change_type}:${message.path}:${message.timestamp}`;
            const state = get();
            
            // Check for duplicate events using timestamp and path
            if (state.lastProcessedEvents.has(eventKey)) {
              console.log('🔄 Skipping duplicate WebSocket event:', eventKey);
              return;
            }
            
            // Track processed events (keep last 100 to prevent memory leaks)
            const processedEvents = new Set(state.lastProcessedEvents);
            if (processedEvents.size > 100) {
              const firstEvent = processedEvents.values().next().value;
              if (firstEvent) {
                processedEvents.delete(firstEvent);
              }
            }
            processedEvents.add(eventKey);
            set({ lastProcessedEvents: processedEvents });
            
            console.log('📁 Processing file system change:', message);
            console.log('🌳 BEFORE UPDATE - Current tree state:');
            console.log('📊 Total nodes:', get().nodes.size);
            console.log('🗂️ File tree:', JSON.stringify(get().fileTree, null, 2));
            
            get().updateTreeNode({
              change_type: message.change_type,
              path: message.path,
              is_dir: message.is_dir,
              timestamp: message.timestamp
            });
            
            console.log('🌳 AFTER UPDATE - Updated tree state:');
            console.log('📊 Total nodes:', get().nodes.size);
            console.log('🗂️ File tree:', JSON.stringify(get().fileTree, null, 2));
            console.log('✅ Tree update completed');
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        set({ 
          isConnected: false,
          wsStatus: 'error',
          lastTreeUpdate: Date.now()
        });
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        set({ 
          isConnected: false,
          wsStatus: 'error',
          lastTreeUpdate: Date.now()
        });
      };
      
      // Store WebSocket reference for cleanup
      (get() as any).ws = ws;
      
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
        set({ 
        isConnected: false,
        wsStatus: 'disconnected',
        lastTreeUpdate: Date.now()
      });
    }
  },

  disconnectWebSocket: () => {
    console.log('🔌 Disconnecting WebSocket...');
    
    const ws = (get() as any).ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    
    set({ 
      isConnected: false,
      isSubscribed: false,
      wsStatus: 'disconnected',
      lastTreeUpdate: Date.now()
    });
  },

  subscribeToFileChanges: () => {
    console.log('📡 Subscribing to file changes...');
    
    const ws = (get() as any).ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        root_path: get().rootPath
      }));
    }
    
    set({ 
      isSubscribed: true,
      lastTreeUpdate: Date.now()
    });
  },

  unsubscribeFromFileChanges: () => {
    console.log('📡 Unsubscribing from file changes...');
    
    const ws = (get() as any).ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'unsubscribe'
      }));
    }
    
    set({ 
      isSubscribed: false,
      lastTreeUpdate: Date.now()
    });
  },

  // Direct tree manipulation for real-time updates (inspired by original FileExplorer)
  updateTreeNode: (event: FileSystemChangeEvent) => {
    console.log('🔥 === STARTING TREE UPDATE ===');
    console.log('📝 Event details:', event);
    
    const state = get();
    if (!state.fileTree) {
      console.log('⚠️ No file tree to update, skipping direct update');
      return;
    }

    console.log(`🌳 Direct tree update: ${event.change_type} - ${event.path} (isDir: ${event.is_dir})`);
    console.log('📊 Current state before update:');
    console.log('   - Total nodes in map:', state.nodes.size);
    console.log('   - File tree root:', state.fileTree.path);
    console.log('   - Selected paths:', state.selectedPaths);
    console.log('   - Expanded paths:', state.expandedPaths);
    
    // Skip Vim temporary files
    if (isVimTempFile(event.path)) {
      console.log(`⏭️ Skipping Vim temporary file in tree update: ${event.path}`);
      return;
    }
    
    // Clone the current tree to avoid mutations
    const updatedTree = JSON.parse(JSON.stringify(state.fileTree));
    let treeModified = false;
    
    console.log('🔄 Processing change type:', event.change_type);
    
    if (event.change_type === 'deleted') {
      // Remove the node from the tree
      const removed = removeNodeFromTree(updatedTree, event.path);
      if (removed) {
        console.log(`✅ Removed node from tree: ${event.path}`);
        treeModified = true;
        
        // Clean up state
        state.nodes.delete(event.path);
        state.selectedPaths = state.selectedPaths.filter((path: string) => path !== event.path);
        state.expandedPaths = state.expandedPaths.filter((path: string) => path !== event.path);
        if (state.activePath === event.path) {
          state.activePath = null;
        }
      } else {
        console.log(`⚠️ Node not found in tree for removal: ${event.path}`);
      }
    } else if (event.change_type === 'created') {
      // Add the new node to the tree
      const added = addNodeToTree(updatedTree, event.path, event.is_dir);
      if (added) {
        console.log(`✅ Added node to tree: ${event.path}`);
        treeModified = true;
        
        // Add to nodes map
        const pathParts = event.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('/') || '/';
        
        const newNode: FileNode = {
          path: event.path,
          name: fileName,
          is_dir: event.is_dir,
          size: 0,
          modified: event.timestamp,
          children: event.is_dir ? [] : undefined,
          parent: parentPath,
          expanded: false,
          selected: false,
          active: false
        };
        
        state.nodes.set(event.path, newNode);
      } else {
        console.log(`⚠️ Could not add node to tree: ${event.path}`);
      }
    } else if (event.change_type === 'modified') {
      // Update the node's metadata
      const updated = updateNodeInTree(updatedTree, event.path);
      if (updated) {
        console.log(`✅ Updated node in tree: ${event.path}`);
        treeModified = true;
        
        // Update in nodes map
        const node = state.nodes.get(event.path);
        if (node) {
          node.modified = event.timestamp;
        }
      }
    }
    
    // Update state if tree was modified
    if (treeModified) {
      console.log('💾 Applying tree changes to state...');
      console.log('📊 Updated tree structure:', JSON.stringify(updatedTree, null, 2));
      
      set({ 
        fileTree: updatedTree, 
        lastTreeUpdate: Date.now()
      });
      
      console.log(`✅ Tree state updated successfully for ${event.change_type}: ${event.path}`);
      console.log('📊 Final state after update:');
      console.log('   - Total nodes in map:', get().nodes.size);
      console.log('   - Last tree update:', get().lastTreeUpdate);
      console.log('🔥 === TREE UPDATE COMPLETED ===');
    } else {
      console.log('⚠️ No tree modifications were made');
      console.log('🔥 === TREE UPDATE SKIPPED ===');
    }
  },



  collapseAll: () => {
    console.log('📁 Collapsing all nodes');
    set({ 
      expandedPaths: [],
      lastTreeUpdate: Date.now()
    });
  },

  expandToPath: (path: string) => {
    const state = get();
    const node = state.nodes.get(path);
    if (!node) return;

    const newExpandedPaths = [...state.expandedPaths];
    let currentPath = node.parent;
    
    while (currentPath) {
      newExpandedPaths.push(currentPath);
      const parentNode = state.nodes.get(currentPath);
      if (parentNode) {
        currentPath = parentNode.parent;
      } else {
        break;
      }
    }
    
    set({ 
      expandedPaths: newExpandedPaths,
      lastTreeUpdate: Date.now()
    });
  },

  search: (query: string) => {
    const { nodes } = get();
    const results: FileNode[] = [];
    
    for (const node of nodes.values()) {
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        results.push(node);
      }
    }
    
    return results.sort((a, b) => a.name.localeCompare(b.name));
  },

  refreshFileTree: async (force?: boolean) => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    REFRESH FILE TREE                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('🔄 Refreshing file tree from server...', { force });
    
    const state = get();
    
    // Save expanded paths before refresh
    const savedExpandedPaths = [...state.expandedPaths];
    console.log('');
    console.log('📊 STATE BEFORE REFRESH:');
    console.log('  - Expanded paths count:', savedExpandedPaths.length);
    console.log('  - Expanded paths:', savedExpandedPaths);
    console.log('  - Total nodes:', state.nodes.size);
    console.log('  - Root path:', state.rootPath);
    
    set({ isLoading: true, error: null });
    
    try {
      // Clear existing tree state but keep expanded paths
      console.log('');
      console.log('🧹 CLEARING TREE STATE (PRESERVING EXPANDED PATHS)');
      console.log('  - Keeping expanded paths:', savedExpandedPaths);
      
      set({
        fileTree: null,
        nodes: new Map(),
        selectedPaths: [],
        // Keep expanded paths so folders stay open after refresh
        expandedPaths: savedExpandedPaths,
        lastProcessedEvents: new Set(), // Clear processed events on refresh
        lastTreeUpdate: Date.now()
      });
      
      const stateAfterClear = get();
      console.log('');
      console.log('📊 STATE AFTER CLEARING:');
      console.log('  - Expanded paths count:', stateAfterClear.expandedPaths.length);
      console.log('  - Expanded paths:', stateAfterClear.expandedPaths);
      console.log('  - Are they same?', JSON.stringify(savedExpandedPaths) === JSON.stringify(stateAfterClear.expandedPaths));
      
      // Force fresh load from server
      console.log('');
      console.log('⏳ Loading fresh tree from server...');
      await get().loadFileTree(true);
      
      const stateAfterLoad = get();
      console.log('');
      console.log('📊 STATE AFTER LOADING:');
      console.log('  - Expanded paths count:', stateAfterLoad.expandedPaths.length);
      console.log('  - Expanded paths:', stateAfterLoad.expandedPaths);
      console.log('  - Total nodes:', stateAfterLoad.nodes.size);
      console.log('  - Are expanded paths preserved?', JSON.stringify(savedExpandedPaths) === JSON.stringify(stateAfterLoad.expandedPaths));
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ REFRESH COMPLETED SUCCESSFULLY                     ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝');
      console.log('✓ Expanded paths preserved:', stateAfterLoad.expandedPaths.length, 'folders');
      console.log('');
    } catch (error) {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║              ❌ REFRESH FAILED                                     ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝');
      console.error('💥 Error:', error);
      console.log('');
      set({ error: error instanceof Error ? error.message : 'Failed to refresh file tree' });
    } finally {
      set({ isLoading: false, lastTreeUpdate: Date.now() });
    }
  },

  searchFiles: async (query: string) => {
    console.log(' Searching files...', { query });
    set({ 
      isSearching: true, 
      searchQuery: query,
      error: null 
    });
    
    try {
      const results = get().search(query);
      set({ 
        searchResults: results,
        isSearching: false 
      });
    } catch (error) {
      console.error('Search failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false 
      });
    }
  },

  clearSearch: () => {
    console.log(' Clearing search...');
    set({ 
      searchQuery: '',
      searchResults: [],
      isSearching: false 
    });
  },

  createFile: async (name: string, parentPath?: string) => {
    console.log('📄 Creating file...', { name, parentPath });
    set({ isLoading: true, error: null });
    
    try {
      const targetPath = parentPath || get().rootPath;
      const fullPath = `${targetPath}/${name}`.replace(/\/+/g, '/');
      
      await fileExplorerApi.createFile(fullPath, '');
      
      // Refresh tree to show new file
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error) {
      console.error('Create file failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create file',
        isLoading: false 
      });
    }
  },

  createDirectory: async (name: string, parentPath?: string) => {
    console.log('📁 Creating directory...', { name, parentPath });
    set({ isLoading: true, error: null });
    
    try {
      const targetPath = parentPath || get().rootPath;
      const fullPath = `${targetPath}/${name}`.replace(/\/+/g, '/');
      
      await fileExplorerApi.createDirectory(fullPath);
      
      // Refresh tree to show new directory
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error) {
      console.error('Create directory failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create directory',
        isLoading: false 
      });
    }
  },

  deleteItems: async (paths: string[]) => {
    console.log('🗑️ Deleting items...', { paths });
    set({ isLoading: true, error: null });
    
    try {
      for (const path of paths) {
        // Determine if it's a directory by checking the nodes map
        const node = get().nodes.get(path);
        const isDir = node ? node.is_dir : false;
        await fileExplorerApi.deleteItem(path, isDir);
        
        // Close any open tabs for deleted files/directories
        const tabStore = useTabStore.getState();
        const allTabs = tabStore.getAllTabs();
        
        // Find tabs that match the deleted path (exact match or within deleted directory)
        const tabsToClose = allTabs.filter(tab => {
          if (isDir) {
            // If deleting a directory, close all tabs within that directory
            return tab.path.startsWith(path + '/') || tab.path === path;
          } else {
            // If deleting a file, close the exact tab
            return tab.path === path;
          }
        });
        
        // Close the matching tabs
        tabsToClose.forEach(tab => {
          tabStore.closeTab(tab.id);
          console.log(`🗑️ Closed tab for deleted ${isDir ? 'directory' : 'file'}: ${tab.path}`);
        });
      }
      
      // Refresh tree to remove deleted items
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error) {
      console.error('Delete items failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete items',
        isLoading: false 
      });
    }
  },

  renameItem: async (oldPath: string, newName: string) => {
    console.log('✏️ Renaming item...', { oldPath, newName });
    set({ isLoading: true, error: null });
    
    try {
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`.replace(/\/+/g, '/');
      
      await fileExplorerApi.renameItem(oldPath, newPath);
      
      // Update any open tabs for renamed files/directories
      const tabStore = useTabStore.getState();
      const allTabs = tabStore.getAllTabs();
      
      // Find tabs that match the renamed path
      const tabsToUpdate = allTabs.filter(tab => {
        const node = get().nodes.get(oldPath);
        const isDir = node ? node.is_dir : false;
        
        if (isDir) {
          // If renaming a directory, update all tabs within that directory
          return tab.path.startsWith(oldPath + '/') || tab.path === oldPath;
        } else {
          // If renaming a file, update the exact tab
          return tab.path === oldPath;
        }
      });
      
      // Update the matching tabs with new paths and names
      tabsToUpdate.forEach(tab => {
        const node = get().nodes.get(oldPath);
        const isDir = node ? node.is_dir : false;
        
        let updatedPath: string;
        let updatedName: string;
        
        if (isDir) {
          // For directory renames, update the path prefix
          if (tab.path === oldPath) {
            updatedPath = newPath;
            updatedName = newName;
          } else {
            // Update paths within the renamed directory
            updatedPath = tab.path.replace(oldPath + '/', newPath + '/');
            updatedName = updatedPath.substring(updatedPath.lastIndexOf('/') + 1);
          }
        } else {
          // For file renames, update the exact path and name
          updatedPath = newPath;
          updatedName = newName;
        }
        
        tabStore.updateTab(tab.id, {
          path: updatedPath,
          name: updatedName
        });
        
        console.log(`✏️ Updated tab: ${tab.path} → ${updatedPath}`);
      });
      
      // Refresh tree to show renamed item
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error) {
      console.error('Rename item failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to rename item',
        isLoading: false 
      });
    }
  },

  duplicateItem: async (sourcePath: string, destinationPath: string) => {
    console.log('📋 Duplicating item...', { sourcePath, destinationPath });
    set({ isLoading: true, error: null });
    
    try {
      await fileExplorerApi.duplicateItem(sourcePath, destinationPath);
      
      // Refresh tree to show duplicated item
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error) {
      console.error('Duplicate item failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to duplicate item',
        isLoading: false 
      });
    }
  },

  uploadFiles: async (files: File[], targetPath: string) => {
    console.log('📤 Uploading files...', { files: files.length, targetPath });
    set({ isLoading: true, error: null });
    
    try {
      for (const file of files) {
        try {
          await fileExplorerApi.uploadFile(file, targetPath);
        } catch (error: any) {
          // Handle file already exists (409 Conflict)
          if (error.message?.includes('409') || error.message?.includes('Conflict')) {
            console.log(`⚠️ File already exists: ${file.name}. Asking user for overwrite...`);
            
            // Ask user if they want to overwrite
            const shouldOverwrite = window.confirm(
              `File "${file.name}" already exists. Do you want to overwrite it?`
            );
            
            if (shouldOverwrite) {
              // Retry with overwrite=true by creating a custom upload request
              const filePath = `${targetPath}/${file.name}`;
              const rootPath = (typeof window !== 'undefined' ? localStorage.getItem('fileExplorerRootPath') : null) || '/home';
              const params = new URLSearchParams({
                file_path: filePath,
                root_path: rootPath,
                overwrite: 'true'
              });

              const formData = new FormData();
              formData.append('file', file);

              // Get auth token for upload (no Content-Type header for FormData)
              const token = typeof window !== 'undefined' ? useAuthStore.getState().token : null;
              const uploadHeaders: Record<string, string> = {};
              if (token) {
                uploadHeaders['Authorization'] = `Bearer ${token}`;
              }

              const response = await fetch(`${buildUrl('/upload')}?${params}`, {
                method: 'POST',
                headers: uploadHeaders,
                body: formData
              });

              if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
              }
              
              console.log(`✅ File overwritten successfully: ${file.name}`);
            } else {
              console.log(`⏭️ Skipped uploading: ${file.name}`);
              continue;
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
      }
      
      // Force refresh tree to show uploaded files (bypass cache)
      await get().loadFileTree(true);
      set({ isLoading: false });
      console.log('✅ Files uploaded and tree refreshed successfully');
    } catch (error) {
      console.error('❌ Upload files failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to upload files',
        isLoading: false 
      });
    }
  },

  downloadFile: async (path: string) => {
    console.log('⬇️ Downloading file:', path);
    set({ isLoading: true, error: null });

    try {
      const blob = await fileExplorerApi.downloadFile(path);
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ File download initiated');
      set({ isLoading: false });
    } catch (error) {
      console.error('❌ Download failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Download failed',
        isLoading: false 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  // Clipboard operations
  cutItems: (paths: string[]) => {
    console.log('✂️ Cutting items:', paths);
    set({
      clipboard: {
        items: paths,
        operation: 'cut',
      },
    });
  },

  copyItems: (paths: string[]) => {
    console.log('📋 Copying items:', paths);
    set({
      clipboard: {
        items: paths,
        operation: 'copy',
      },
    });
  },

  pasteItems: async (targetPath: string) => {
    const { clipboard } = get();
    if (!clipboard.operation || clipboard.items.length === 0) {
      console.log('⚠️ Nothing to paste');
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      if (clipboard.operation === 'copy') {
        // For copy operation, duplicate each item individually
        for (const sourcePath of clipboard.items) {
          const fileName = sourcePath.split('/').pop() || 'file';
          const destinationPath = `${targetPath}/${fileName}`;
          await fileExplorerApi.duplicateItem(sourcePath, destinationPath);
        }
      } else if (clipboard.operation === 'cut') {
        await fileExplorerApi.moveItems(clipboard.items, targetPath);
        // Clear clipboard after successful cut operation
        set({ clipboard: { items: [], operation: null } });
      }

      // Refresh tree to reflect changes
      await get().refreshFileTree();
      console.log('✅ Paste operation completed');
    } catch (error) {
      console.error('❌ Paste operation failed:', error);
      set({ error: error instanceof Error ? error.message : 'Paste operation failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  canPaste: () => {
    const { clipboard } = get();
    return clipboard.operation !== null && clipboard.items.length > 0;
  },
};
});
