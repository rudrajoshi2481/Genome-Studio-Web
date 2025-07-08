// # persis state store of Zustand for FileExplorer

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FileExplorer, FileNode, InitialTreeEvent } from './FileExplorerClass'
import { useAuthToken } from '@/lib/stores/auth-store'
import * as authService from '@/lib/services/auth-service'
import { host, port } from '@/config/server'

interface FileExplorerStore {
  // Core state
  fileExplorer: FileExplorer
  rootPath: string
  fileTree: FileNode | null
  selectedPaths: string[]
  activePath: string | null
  expandedPaths: string[]
  isLoading: boolean
  error: string | null
  wsStatus: 'connected' | 'disconnected' | 'error'
  wsInstance: WebSocket | null
  
  // Actions
  setRootPath: (path: string) => void
  initializeTree: (data: InitialTreeEvent) => void
  toggleNode: (path: string) => void
  selectNode: (path: string, multiSelect?: boolean) => void
  setActivePath: (path: string) => void
  isNodeExpanded: (path: string) => boolean
  refreshFileTree: () => void
  connectWebSocket: () => void
  disconnectWebSocket: () => void
  createNewFile: (fileName: string, parentPath?: string) => Promise<void>
  createNewFolder: (folderName: string, parentPath?: string) => Promise<void>
  collapseAll: () => void
}

// Create the store with persistence
export const useFileExplorerStore = create<FileExplorerStore>()(
  persist(
    (set, get) => {
      // Initialize the FileExplorer instance with a default path
      // The path will be configurable via setRootPath
      const fileExplorer = new FileExplorer('/')
      
      return {
        // State
        fileExplorer,
        rootPath: '/',
        fileTree: null, 
        selectedPaths: [],
        activePath: null,
        expandedPaths: [],
        isLoading: false,
        error: null,
        wsStatus: 'disconnected' as 'connected' | 'disconnected' | 'error',
        wsInstance: null as WebSocket | null,
        
        // Set root path for all operations
        setRootPath: (path: string) => {
          console.log(`Setting root path to: ${path}`);
          set({ rootPath: path });
          fileExplorer.setRootPath(path);
        },
        
        // Actions
        initializeTree: (data: InitialTreeEvent) => {
          const { fileExplorer } = get()
          fileExplorer.initializeTree(data)
          
          set({
            fileTree: fileExplorer.getTreeStructure(),
            rootPath: data.directory
          })
        },
        
        toggleNode: (path: string) => {
          console.log('Store: toggling node', path)
          
          // Skip Vim temporary files
          if (path.endsWith('/4913') || path === '/4913' || path.includes('.sw')) {
            console.log(`Preventing toggle of Vim temporary file: ${path}`);
            return false;
          }
          
          const { fileExplorer } = get()
          const expanded = fileExplorer.toggleExpanded(path)
          console.log('Node expanded state after toggle:', expanded)
          
          // Get all expanded paths from the file explorer
          const expandedPaths = fileExplorer.getAllExpandedPaths()
          
          // Update the store with the new tree structure
          set({
            fileTree: fileExplorer.getTreeStructure(),
            expandedPaths
          })
          
          return expanded
        },
        
        selectNode: (path: string, multiSelect: boolean = false) => {
          // Skip Vim temporary files
          if (path.endsWith('/4913') || path === '/4913' || path.includes('.sw')) {
            console.log(`Preventing selection of Vim temporary file: ${path}`);
            return;
          }
          
          const { fileExplorer } = get();
          fileExplorer.selectFile(path, multiSelect);
          
          // Get the node to check if it's a directory
          const node = fileExplorer.getNodeByPath(path);
          
          // Log the selected node
          // console.log('Selected node:', { path, isDirectory: node?.is_dir, name: node?.name });
          
          // If it's a directory, log it as the active folder
          if (node?.is_dir) {
            console.log('Active folder:', { path, name: node.name });
          }
          
          // Set as active
          fileExplorer.setActive(path);
          
          // Update state
          set({
            selectedPaths: fileExplorer.getSelectedPaths(),
            activePath: fileExplorer.getActivePath()
          });
        },
        
        setActivePath: (path: string) => {
          const { fileExplorer } = get();
          fileExplorer.setActive(path);
          
          // Get the node to check if it's a directory
          const node = fileExplorer.getNodeByPath(path);
          
          // Log the active path
          console.log('Set active path:', { path, isDirectory: node?.is_dir, name: node?.name });
          if (node?.is_dir) {
            console.log('Active folder:', { path, name: node.name });
          }
          
          set({ activePath: path });
        },
        
        isNodeExpanded: (path: string) => {
          const { fileExplorer } = get()
          return fileExplorer.isExpanded(path)
        },
        
        refreshFileTree: () => {
          set({ isLoading: true, error: null })
          
          // Use the rootPath from the store
          const { rootPath } = get()
          const directory = encodeURIComponent(rootPath)
          
          // Get the auth token
          let token = authService.getToken()
          
          // For development purposes, use a mock token if no token is available
          if (!token) {
            console.warn('No auth token found, using development mock token')
            token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZlbG9wbWVudCIsImV4cCI6MTcxNzYxMjgwMH0.example-mock-token'
          }
          
          console.log('Using token for API request:', token ? 'Token available' : 'No token')
          
          // Fetch the file tree from the API
          fetch(`http://${host}:${port}/api/v1/file-explorer/tree?directory=${directory}`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
            .then(response => {
              if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
              }
              return response.json();
            })
            .then((data: InitialTreeEvent) => {
              // Initialize the tree with the received data
              get().initializeTree(data);
              set({ isLoading: false });
              
              // Connect to WebSocket after successful fetch
              get().connectWebSocket();
            })
            .catch(error => {
              console.error('Error fetching file tree:', error);
              set({ 
                isLoading: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            });
        },
        
        // WebSocket connection methods
        
        connectWebSocket: () => {
          const { rootPath, wsInstance } = get();
          
          // Close existing connection if any
          if (wsInstance) {
            wsInstance.close();
          }
          
          // Use the rootPath from the store
          const directory = encodeURIComponent(rootPath);
          let token = authService.getToken();
          
          // For development purposes, use a mock token if no token is available
          if (!token) {
            console.warn('No auth token found for WebSocket, using development mock token');
            token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZlbG9wbWVudCIsImV4cCI6MTcxNzYxMjgwMH0.example-mock-token';
          }
          
          // console.log('Using token for WebSocket:', token ? 'Token available' : 'No token');
          const wsUrl = `ws://150.250.96.50:8000/api/v1/file-explorer/watch?directory=${directory}&token=${token}`;
          
          try {
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
              // console.log('WebSocket connected');
              set({ wsStatus: 'connected', wsInstance: ws });
            };
            
            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                const { fileExplorer } = get();
                
                // Handle file changes
                if (data.type === 'file_changes') {
                  // console.log('WebSocket received file changes:', data.changes);
                  
                  // Log the file structure before changes
                  const beforeTree = fileExplorer.getTreeStructure();
                  // console.log('File structure before changes:', JSON.stringify(beforeTree, null, 2));
                  
                  // Apply changes
                  fileExplorer.handleFileChanges(data);
                  
                  // Get the updated tree structure
                  const updatedTree = fileExplorer.getTreeStructure();
                  
                  // Log the file structure after changes
                  // console.log('File structure after changes:', JSON.stringify(updatedTree, null, 2));
                  
                  // Update the store with the new tree structure
                  set({ fileTree: updatedTree });
                  
                  // Log expanded paths
                  // console.log('Current expanded paths:', fileExplorer.getAllExpandedPaths());
                }
              } catch (error) {
                // console.error('Error processing WebSocket message:', error);
              }
            };
            
            ws.onerror = (error) => {
              // console.error('WebSocket error:', error);
              set({ wsStatus: 'error' });
            };
            
            ws.onclose = () => {
              // console.log('WebSocket disconnected');
              set({ wsStatus: 'disconnected', wsInstance: null });
            };
            
          } catch (error) {
            // console.error('Error connecting to WebSocket:', error);
            set({ wsStatus: 'error' });
          }
        },
        
        disconnectWebSocket: () => {
          const { wsInstance } = get();
          if (wsInstance) {
            wsInstance.close();
            set({ wsStatus: 'disconnected', wsInstance: null });
          }
        },
        
        // Create a new file at the current path
        createNewFile: async (fileName: string, parentPath?: string) => {
          // Use the provided parentPath or the rootPath from the store
          const { rootPath } = get();
          const actualParentPath = parentPath || rootPath;
          try {
            set({ isLoading: true, error: null });
            const { fileExplorer } = get();
            
            // Get the auth token
            let token = authService.getToken();
            if (!token) {
              console.warn('No auth token found, using development mock token');
              token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZlbG9wbWVudCIsImV4cCI6MTcxNzYxMjgwMH0.example-mock-token';
            }
            
            // Create the new file via API
            const response = await fetch(`http://${host}:${port}/api/v1/file-explorer/create-file`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                path: `${actualParentPath}/${fileName}`,
                root_path: rootPath,
                content: ''
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to create file: ${response.statusText}`);
            }
            
            // Refresh the file tree
            get().refreshFileTree();
            
          } catch (error: any) {
            console.error('Error creating new file:', error);
            set({ error: `Failed to create file: ${error?.message || 'Unknown error'}`, isLoading: false });
          }
        },
        
        // Create a new folder at the current path
        createNewFolder: async (folderName: string, parentPath?: string) => {
          // Use the provided parentPath or the rootPath from the store
          const { rootPath } = get();
          const actualParentPath = parentPath || rootPath;
          try {
            set({ isLoading: true, error: null });
            const { fileExplorer } = get();
            
            // Get the auth token
            let token = authService.getToken();
            if (!token) {
              console.warn('No auth token found, using development mock token');
              token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZlbG9wbWVudCIsImV4cCI6MTcxNzYxMjgwMH0.example-mock-token';
            }
            
            // Create the new folder via API
            const response = await fetch(`http://${host}:${port}/api/v1/file-explorer/create-directory`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                path: `${actualParentPath}/${folderName}`,
                root_path: rootPath
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to create folder: ${response.statusText}`);
            }
            
            // Refresh the file tree
            get().refreshFileTree();
            
          } catch (error: any) {
            console.error('Error creating new folder:', error);
            set({ error: `Failed to create folder: ${error?.message || 'Unknown error'}`, isLoading: false });
          }
        },
        
        // Collapse all expanded nodes
        collapseAll: () => {
          const { fileExplorer } = get();
          fileExplorer.collapseAll();
          // Update the store's expanded paths state
          set(state => ({ ...state })); // Just trigger a re-render with updated state from fileExplorer
        }
      }
    },
    {
      name: 'file-explorer-storage',
      partialize: (state) => ({
        rootPath: state.rootPath,
        selectedPaths: state.selectedPaths,
        activePath: state.activePath,
        expandedPaths: state.expandedPaths
      })
    }
  )
)