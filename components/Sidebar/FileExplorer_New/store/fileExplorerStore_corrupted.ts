/**
 * Robust File Explorer Store with Direct Tree Manipulation
 * Based on the original FileExplorer class logic for reliable real-time updates
 */

import { create } from 'zustand';
import * as authService from '@/lib/services/auth-service';
import { fileExplorerApi } from '../services/api';
import { host, port } from '@/config/server';

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
}

// Clipboard state for cut/copy operations
interface ClipboardState {
  operation: 'cut' | 'copy' | null;
  items: string[];
  timestamp: number;
}

interface FileExplorerStore extends FileExplorerState {
  // Clipboard state
  clipboard: ClipboardState;
  
  // Actions
  setRootPath: (path: string) => void;
  loadFileTree: (forceFresh?: boolean) => Promise<void>;
  refreshFileTree: (force?: boolean) => Promise<void>;
  initializeTree: (rootNode: FileNode) => void;
  toggleNode: (path: string) => void;
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
  uploadFiles: (files: File[], targetPath: string) => Promise<void>;
  clearError: () => void;
  
  // Advanced file operations
  cutItems: (paths: string[]) => void;
  copyItems: (paths: string[]) => void;
  pasteItems: (targetPath: string) => Promise<void>;
  clearClipboard: () => void;
  canPaste: () => boolean;
  downloadFile: (path: string) => Promise<void>;
  bulkDeleteItems: (paths: string[]) => Promise<void>;
  compressFiles: (paths: string[], outputPath: string, format?: 'zip' | 'tar') => Promise<void>;
  extractArchive: (archivePath: string, destination: string) => Promise<void>;
  createSymlink: (source: string, target: string) => Promise<void>;
  getFileInfo: (path: string) => Promise<any>;
  getFileVersions: (filePath: string) => Promise<any>;
  rollbackFile: (filePath: string, version: number) => Promise<void>;
  createFromTemplate: (templateName: string, filePath: string, variables: Record<string, string>) => Promise<void>;
  getTemplates: () => Promise<any>;
  advancedSearch: (searchParams: any) => Promise<void>;
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

export const useFileExplorerStore = create<FileExplorerStore>()((set, get) => ({
  // Initialize with empty state
  fileTree: null,
  nodes: new Map(),
  rootPath: '/home',
  selectedPaths: [],
  expandedPaths: [],
  activePath: null,
  isLoading: false,
  error: null,
  isConnected: false,
  wsStatus: 'disconnected',
  lastTreeUpdate: 0,
  clipboard: {
    operation: null,
    items: [],
    timestamp: 0
  },
  lastProcessedEvents: new Set(),
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  isSubscribed: false,

  // Actions
  setRootPath: (path: string) => {
    console.log(`🌳 Setting root path from ${get().rootPath} to ${path}`);
    const state = get();
    
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
    
    // Clear existing state
    state.nodes.clear();
    state.selectedPaths = [];
    state.expandedPaths = [];
    
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
    
    // Set initial expanded paths
    state.expandedPaths.push(rootNode.path);
    
    // Update state
    set({ 
      fileTree: rootNode,
      lastTreeUpdate: Date.now()
    });
    
    console.log(`🌳 Tree initialized with ${state.nodes.size} nodes`);
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
    }
    
    set({ 
      expandedPaths: newExpandedPaths,
      lastTreeUpdate: Date.now()
    });
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
        state.selectedPaths = state.selectedPaths.filter(path => path !== event.path);
        state.expandedPaths = state.expandedPaths.filter(path => path !== event.path);
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
    console.log('🔄 Refreshing file tree from server...', { force });
    set({ isLoading: true, error: null });
    
    try {
      // Clear existing tree state to ensure fresh data
      console.log('🧹 Clearing existing tree state...');
      set({
        fileTree: null,
        nodes: new Map(),
        selectedPaths: [],
        expandedPaths: [],
        lastProcessedEvents: new Set(), // Clear processed events on refresh
        lastTreeUpdate: Date.now()
      });
      
      // Force fresh load from server
      await get().loadFileTree(true);
      
      console.log('✅ File tree refreshed successfully from server');
    } catch (error) {
      console.error('❌ Error refreshing file tree:', error);
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

  uploadFiles: async (files: File[], targetPath: string) => {
    console.log('📤 Uploading files...', { files: files.length, targetPath });
    set({ isLoading: true, error: null });
    
    try {
      for (const file of files) {
        await fileExplorerApi.uploadFile(file, targetPath);
      }
      
      // Refresh tree to show uploaded files
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error) {
      console.error('Upload files failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to upload files',
        isLoading: false 
      });
    }
  },

  clearError: () => {
    console.log('🧹 Clearing error...');
    set({ error: null });
  },

  // Advanced file operations
  cutItems: (paths: string[]) => {
    console.log('✂️ Cutting items:', paths);
    set({
      clipboard: {
        operation: 'cut',
        items: [...paths],
        timestamp: Date.now()
      }
    });
  },

  copyItems: (paths: string[]) => {
    console.log('📋 Copying items:', paths);
    set({
      clipboard: {
        operation: 'copy',
        items: [...paths],
        timestamp: Date.now()
      }
    });
  },

  pasteItems: async (targetPath: string) => {
    const { clipboard } = get();
    if (!clipboard.operation || clipboard.items.length === 0) {
      console.log('⚠️ Nothing to paste');
      return;
    }

    console.log(`📌 Pasting ${clipboard.operation} items to:`, targetPath);
    set({ isLoading: true, error: null });

    try {
      if (clipboard.operation === 'copy') {
        await fileExplorerApi.copyItems(clipboard.items, targetPath);
      } else if (clipboard.operation === 'cut') {
        await fileExplorerApi.moveItems(clipboard.items, targetPath);
        // Clear clipboard after successful cut operation
        set({
          clipboard: { operation: null, items: [], timestamp: 0 }
        });
      }

      // Refresh the file tree to show changes
      await get().loadFileTree();
      console.log('✅ Paste operation completed');
    } catch (error) {
      console.error('❌ Paste operation failed:', error);
      set({ error: error instanceof Error ? error.message : 'Paste operation failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearClipboard: () => {
    console.log('🧹 Clearing clipboard');
    set({
      clipboard: { operation: null, items: [], timestamp: 0 }
    });
  },

  canPaste: () => {
    const { clipboard } = get();
    return clipboard.operation !== null && clipboard.items.length > 0;
  },

  downloadFile: async (path: string) => {
    console.log('⬇️ Downloading file:', path);
    try {
      const blob = await fileExplorerApi.downloadFile(path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      console.log('✅ File download initiated');
    } catch (error) {
      console.error('❌ Download failed:', error);
      set({ error: error instanceof Error ? error.message : 'Download failed' });
    }
  },

  bulkDeleteItems: async (paths: string[]) => {
    console.log('🗑️ Bulk deleting items:', paths);
    set({ isLoading: true, error: null });

    try {
      await fileExplorerApi.bulkDeleteItems(paths);
      await get().loadFileTree();
      console.log('✅ Bulk delete completed');
    } catch (error) {
      console.error('❌ Bulk delete failed:', error);
      set({ error: error instanceof Error ? error.message : 'Bulk delete failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  compressFiles: async (paths: string[], outputPath: string, format: 'zip' | 'tar' = 'zip') => {
    console.log('🗜️ Compressing files:', { paths, outputPath, format });
    set({ isLoading: true, error: null });

    try {
      await fileExplorerApi.compressFiles(paths, outputPath, format);
      await get().loadFileTree();
      console.log('✅ Compression completed');
    } catch (error) {
      console.error('❌ Compression failed:', error);
      set({ error: error instanceof Error ? error.message : 'Compression failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  extractArchive: async (archivePath: string, destination: string) => {
    console.log('📦 Extracting archive:', { archivePath, destination });
    set({ isLoading: true, error: null });

    try {
      await fileExplorerApi.extractArchive(archivePath, destination);
      await get().loadFileTree();
      console.log('✅ Extraction completed');
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      set({ error: error instanceof Error ? error.message : 'Extraction failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  createSymlink: async (source: string, target: string) => {
    console.log('🔗 Creating symlink:', { source, target });
    set({ isLoading: true, error: null });

    try {
      await fileExplorerApi.createSymlink(source, target);
      await get().loadFileTree();
      console.log('✅ Symlink created');
    } catch (error) {
      console.error('❌ Symlink creation failed:', error);
      set({ error: error instanceof Error ? error.message : 'Symlink creation failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  getFileInfo: async (path: string) => {
    console.log('ℹ️ Getting file info:', path);
    try {
      const info = await fileExplorerApi.getFileInfo(path);
      console.log('✅ File info retrieved:', info);
      return info;
    } catch (error) {
      console.error('❌ Failed to get file info:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to get file info' });
      throw error;
    }
  },

  getFileVersions: async (filePath: string) => {
    console.log('📚 Getting file versions:', filePath);
    try {
      const versions = await fileExplorerApi.getFileVersions(filePath);
      console.log('✅ File versions retrieved:', versions);
      return versions;
    } catch (error) {
      console.error('❌ Failed to get file versions:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to get file versions' });
      throw error;
    }
  },

  rollbackFile: async (filePath: string, version: number) => {
    console.log('⏪ Rolling back file:', { filePath, version });
    set({ isLoading: true, error: null });

    try {
      await fileExplorerApi.rollbackFile(filePath, version);
      await get().loadFileTree();
      console.log('✅ File rollback completed');
    } catch (error) {
      console.error('❌ File rollback failed:', error);
      set({ error: error instanceof Error ? error.message : 'File rollback failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  createFromTemplate: async (templateName: string, filePath: string, variables: Record<string, string>) => {
    console.log('📄 Creating from template:', { templateName, filePath, variables });
    set({ isLoading: true, error: null });

    try {
      await fileExplorerApi.createFromTemplate(templateName, filePath, variables);
      await get().loadFileTree();
      console.log('✅ File created from template');
    } catch (error) {
      console.error('❌ Template creation failed:', error);
      set({ error: error instanceof Error ? error.message : 'Template creation failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  getTemplates: async () => {
    console.log('📋 Getting available templates');
    try {
      const templates = await fileExplorerApi.getTemplates();
      console.log('✅ Templates retrieved:', templates);
      return templates;
    } catch (error) {
      console.error('❌ Failed to get templates:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to get templates' });
      throw error;
    }
  },

  advancedSearch: async (searchParams: any) => {
    console.log('🔍 Advanced search:', searchParams);
    set({ isSearching: true, error: null });

    try {
      const results = await fileExplorerApi.advancedSearch(searchParams);
      set({
        searchResults: results.map((result: any) => ({
          path: result.path,
          name: result.name || result.path.split('/').pop(),
          type: result.type || 'file',
          is_dir: result.type === 'directory',
          size: result.size || 0,
          modified: result.modified || new Date().toISOString(),
          children: [],
          active: false
        })),
        isSearching: false
      });
      console.log('✅ Advanced search completed');
    } catch (error) {
      console.error('❌ Advanced search failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Advanced search failed',
        isSearching: false 
      });
    }
  }
}));

refreshFileTree: async (force?: boolean) => {
  console.log(' Refreshing file tree from server...', { force });
  set({ isLoading: true, error: null });
    
  try {
    // Clear existing tree state to ensure fresh data
    console.log(' Clearing existing tree state...');
    set({
      fileTree: null,
      nodes: new Map(),
      selectedPaths: [],
      expandedPaths: [],
      lastProcessedEvents: new Set(), // Clear processed events on refresh
      lastTreeUpdate: Date.now()
    });
    
    // Force fresh load from server
    await get().loadFileTree(true);
    
    console.log(' File tree refreshed successfully from server');
  } catch (error) {
    console.error(' Error refreshing file tree:', error);
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
console.log(' Creating file...', { name, parentPath });
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
console.log(' Creating directory...', { name, parentPath });
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
console.log(' Deleting items...', { paths });
set({ isLoading: true, error: null });
  
try {
  for (const path of paths) {
    // Determine if it's a directory by checking the nodes map
    const node = get().nodes.get(path);
    const isDir = node ? node.is_dir : false;
    await fileExplorerApi.deleteItem(path, isDir);
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
console.log(' Renaming item...', { oldPath, newName });
set({ isLoading: true, error: null });
  
try {
  const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
  const newPath = `${parentPath}/${newName}`.replace(/\/+/g, '/');
  
  await fileExplorerApi.renameItem(oldPath, newPath);
  
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

uploadFiles: async (files: File[], targetPath: string) => {
console.log(' Uploading files...', { files: files.length, targetPath });
set({ isLoading: true, error: null });
  
try {
  for (const file of files) {
    await fileExplorerApi.uploadFile(file, targetPath);
  }
  
  // Refresh tree to show uploaded files
  await get().loadFileTree();
  set({ isLoading: false });
} catch (error) {
  console.error('Upload files failed:', error);
  set({ 
    error: error instanceof Error ? error.message : 'Failed to upload files',
    isLoading: false 
  });
}
},

clearError: () => {
console.log(' Clearing error...');
set({ error: null });
},

cutItems: (paths: string[]) => {
console.log(' Cutting items:', paths);
set({
  clipboard: {
    operation: 'cut',
    items: [...paths],
    timestamp: Date.now()
  }
});
},

copyItems: (paths: string[]) => {
console.log(' Copying items:', paths);
set({
  clipboard: {
    operation: 'copy',
    items: [...paths],
    timestamp: Date.now()
  }
});
},

pasteItems: async (targetPath: string) => {
const { clipboard } = get();
if (!clipboard.operation || clipboard.items.length === 0) {
  console.log(' Nothing to paste');
  return;
}

console.log(` Pasting ${clipboard.operation} items to:`, targetPath);
set({ isLoading: true, error: null });

try {
  if (clipboard.operation === 'copy') {
    await fileExplorerApi.copyItems(clipboard.items, targetPath);
  } else if (clipboard.operation === 'cut') {
    await fileExplorerApi.moveItems(clipboard.items, targetPath);
    // Clear clipboard after successful cut operation
    set({
      clipboard: { operation: null, items: [], timestamp: 0 }
    });
  }

  // Refresh the file tree to show changes
  await get().loadFileTree();
  console.log(' Paste operation completed');
} catch (error) {
  console.error(' Paste operation failed:', error);
  set({ error: error instanceof Error ? error.message : 'Paste operation failed' });
} finally {
  set({ isLoading: false });
}
},

clearClipboard: () => {
console.log(' Clearing clipboard');
set({
  clipboard: { operation: null, items: [], timestamp: 0 }
});
},

canPaste: () => {
const { clipboard } = get();
return clipboard.operation !== null && clipboard.items.length > 0;
},

downloadFile: async (path: string) => {
console.log(' Downloading file:', path);
try {
  const blob = await fileExplorerApi.downloadFile(path);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = path.split('/').pop() || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  console.log(' File download initiated');
} catch (error) {
  console.error(' Download failed:', error);
  set({ error: error instanceof Error ? error.message : 'Download failed' });
}
},

bulkDeleteItems: async (paths: string[]) => {
console.log(' Bulk deleting items:', paths);
set({ isLoading: true, error: null });

try {
  await fileExplorerApi.bulkDeleteItems(paths);
  await get().loadFileTree();
  console.log(' Bulk delete completed');
} catch (error) {
  console.error(' Bulk delete failed:', error);
  set({ error: error instanceof Error ? error.message : 'Bulk delete failed' });
} finally {
  set({ isLoading: false });
}
},

compressFiles: async (paths: string[], outputPath: string, format: 'zip' | 'tar' = 'zip') => {
console.log(' Compressing files:', { paths, outputPath, format });
set({ isLoading: true, error: null });

try {
  await fileExplorerApi.compressFiles(paths, outputPath, format);
  await get().loadFileTree();
  console.log(' Compression completed');
} catch (error) {
  console.error(' Compression failed:', error);
  set({ error: error instanceof Error ? error.message : 'Compression failed' });
} finally {
  set({ isLoading: false });
}
},

extractArchive: async (archivePath: string, destination: string) => {
console.log(' Extracting archive:', { archivePath, destination });
set({ isLoading: true, error: null });

try {
  await fileExplorerApi.extractArchive(archivePath, destination);
  await get().loadFileTree();
  console.log(' Extraction completed');
} catch (error) {
  console.error(' Extraction failed:', error);
  set({ error: error instanceof Error ? error.message : 'Extraction failed' });
} finally {
  set({ isLoading: false });
}
},

createSymlink: async (source: string, target: string) => {
console.log(' Creating symlink:', { source, target });
set({ isLoading: true, error: null });

try {
  await fileExplorerApi.createSymlink(source, target);
  await get().loadFileTree();
  console.log(' Symlink created');
} catch (error) {
  console.error(' Symlink creation failed:', error);
  set({ error: error instanceof Error ? error.message : 'Symlink creation failed' });
} finally {
  set({ isLoading: false });
}
},

getFileInfo: async (path: string) => {
console.log(' Getting file info:', path);
try {
  const info = await fileExplorerApi.getFileInfo(path);
  console.log(' File info retrieved:', info);
  return info;
} catch (error) {
  console.error(' Failed to get file info:', error);
  set({ error: error instanceof Error ? error.message : 'Failed to get file info' });
  throw error;
}
},

getFileVersions: async (filePath: string) => {
console.log(' Getting file versions:', filePath);
try {
  const versions = await fileExplorerApi.getFileVersions(filePath);
  console.log(' File versions retrieved:', versions);
  return versions;
} catch (error) {
  console.error(' Failed to get file versions:', error);
  set({ error: error instanceof Error ? error.message : 'Failed to get file versions' });
  throw error;
}
},

rollbackFile: async (filePath: string, version: number) => {
console.log(' Rolling back file:', { filePath, version });
set({ isLoading: true, error: null });

try {
  await fileExplorerApi.rollbackFile(filePath, version);
  await get().loadFileTree();
  console.log(' File rollback completed');
} catch (error) {
  console.error(' File rollback failed:', error);
  set({ error: error instanceof Error ? error.message : 'File rollback failed' });
} finally {
  set({ isLoading: false });
}
},

createFromTemplate: async (templateName: string, filePath: string, variables: Record<string, string>) => {
console.log(' Creating from template:', { templateName, filePath, variables });
set({ isLoading: true, error: null });

try {
  await fileExplorerApi.createFromTemplate(templateName, filePath, variables);
  await get().loadFileTree();
  console.log(' File created from template');
} catch (error) {
  console.error(' Template creation failed:', error);
  set({ error: error instanceof Error ? error.message : 'Template creation failed' });
} finally {
  set({ isLoading: false });
}
},

getTemplates: async () => {
console.log(' Getting available templates');
try {
  const templates = await fileExplorerApi.getTemplates();
  console.log(' Templates retrieved:', templates);
  return templates;
} catch (error) {
  console.error(' Failed to get templates:', error);
  set({ error: error instanceof Error ? error.message : 'Failed to get templates' });
  throw error;
}
},

advancedSearch: async (searchParams: any) => {
console.log(' Advanced search:', searchParams);
set({ isSearching: true, error: null });

try {
  const results = await fileExplorerApi.advancedSearch(searchParams);
  set({
    searchResults: results.map((result: any) => ({
      path: result.path,
      name: result.name || result.path.split('/').pop(),
      type: result.type || 'file',
      size: result.size || 0,
      modified: result.modified || new Date().toISOString(),
      children: [],
      active: false
    })),
    isSearching: false
  });
  console.log(' Advanced search completed');
} catch (error) {
  console.error(' Advanced search failed:', error);
  set({ 
    error: error instanceof Error ? error.message : 'Advanced search failed',
    isSearching: false 
  });
}
}

{{ ... }}

export default useFileExplorerStore;
