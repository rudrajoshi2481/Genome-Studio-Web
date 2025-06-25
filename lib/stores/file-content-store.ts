import { create } from 'zustand'
import { useAuthToken } from './auth-store'
import * as authService from '../services/auth-service'
import { toast } from "sonner"

interface FileContent {
  path: string
  content: string
  originalContent?: string  // Original content when file was loaded, used for conflict resolution
  metadata: any
  lastUpdated: number
  hasConflicts?: boolean    // Indicates if the file has merge conflicts
}

interface MergeResult {
  merged: boolean;
  hasConflicts: boolean;
  content: string;
}

interface FileContentState {
  files: Record<string, FileContent>
  activeConnections: Set<string>
  isConnecting: boolean
  socket: WebSocket | null
  activeTabs: Set<string>  // Track active tab file paths
  isLoading: boolean
  error: string | null
  recentlySavedFiles: Map<string, number>  // Track recently saved files to prevent immediate reload
  
  // Methods
  getFileContent: (path: string, rootPath: string, forceRefresh?: boolean) => Promise<FileContent>
  updateFileContent: (path: string, content: string, rootPath: string) => Promise<MergeResult>
  connectToFileWatcher: (directory: string) => Promise<void>
  disconnectFromFileWatcher: (directory: string) => void
  handleFileChange: (path: string, newContent: string, metadata: any) => void
  addActiveTab: (filePath: string) => void
  removeActiveTab: (filePath: string) => void
  watchActiveTabFiles: () => void
  watchFile: (filePath: string) => Promise<void>
}

export const useFileContentStore = create<FileContentState>((set, get) => ({
  files: {},
  activeConnections: new Set<string>(),
  isConnecting: false,
  socket: null,
  activeTabs: new Set<string>(),
  isLoading: false,
  error: null,
  recentlySavedFiles: new Map<string, number>(),

  getFileContent: async (path: string, rootPath: string, forceRefresh: boolean = false) => {
    try {
      // Check if we have the file content in the store and it's recent (less than 5 seconds old)
      const existingFile = get().files[path]
      const now = Date.now()
      if (!forceRefresh && existingFile && now - existingFile.lastUpdated < 5000) {
        return existingFile
      }

      // Fetch the file content from the API
      const token = authService.getToken()
      const response = await fetch(`http://localhost:8000/api/v1/file-explorer/file-content?path=${encodeURIComponent(path)}&root_path=${encodeURIComponent(rootPath)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
   
    toast.error(`Failed to fetch file content: ${response.statusText}`)
        // throw new Error(`Failed to fetch file content: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Store the file content
      const fileContent: FileContent = {
        path,
        content: data.content,
        originalContent: data.content, // Save original content for conflict resolution
        metadata: data.metadata,
        lastUpdated: now,
        // Check if content contains conflict markers
        hasConflicts: data.content.includes('<<<<<<< FRONTEND CHANGES') || 
                     data.content.includes('>>>>>>> BACKEND CHANGES')
      }

      set(state => ({
        files: {
          ...state.files,
          [path]: fileContent
        }
      }))

      return fileContent
    } catch (error) {
      console.error('Error fetching file content:', error)
      throw error
    }
  },

  updateFileContent: async (path: string, content: string, rootPath: string) => {
    try {
      // Get the current file state from the store to access original content
      const currentFile = get().files[path]
      const originalContent = currentFile?.originalContent || currentFile?.content
      
      // Mark this file as recently saved to prevent immediate reload from backend
      // This prevents the file watcher from immediately reloading the file we just saved
      // console.log(`Marking ${path} as recently saved at ${Date.now()}`);
      set(state => ({
        recentlySavedFiles: new Map(state.recentlySavedFiles).set(path, Date.now())
      }));
      
      const token = authService.getToken()
      const response = await fetch(`http://localhost:8000/api/v1/file-explorer/update-file-content?root_path=${encodeURIComponent(rootPath)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          path,
          content,
          base_content: originalContent // Send original content for conflict resolution
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update file content: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Check if there was a merge with conflicts
      const merged = data.merged || false
      const hasConflicts = data.has_conflicts || false
      
      if (merged && hasConflicts) {
        console.warn(`Merge conflicts detected in file: ${path}`)
      }
      
      // If the content was merged, we need to fetch the merged content
      let mergedContent = content
      if (merged) {
        // Fetch the updated content after merge
        const updatedFile = await get().getFileContent(path, rootPath, true)
        mergedContent = updatedFile.content
      }
      
      // Update the file content in the store
      set(state => ({
        files: {
          ...state.files,
          [path]: {
            path,
            content: mergedContent,
            originalContent: mergedContent, // Update original content to the merged version
            metadata: data.metadata,
            lastUpdated: Date.now(),
            hasConflicts: hasConflicts
          }
        }
      }))
      
      // Return information about the update
      return {
        merged,
        hasConflicts,
        content: mergedContent
      }
    } catch (error) {
      console.error('Error updating file content:', error)
      throw error
    }
  },

  connectToFileWatcher: async (directory: string) => {
    const { activeConnections, socket, isConnecting } = get()
    
    // If we're already connected to this directory, do nothing
    if (activeConnections.has(directory)) {
      return
    }

    try {
      // If we're already connecting, wait for it to complete
      if (isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100))
        return get().connectToFileWatcher(directory)
      }

      set({ isConnecting: true })

      // If we don't have a socket or it's closed, create a new one
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        const token = authService.getToken()
        const newSocket = new WebSocket(`ws://localhost:8000/api/v1/file-explorer/watch?token=${token}&directory=${encodeURIComponent(directory)}`)
        
        newSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // Handle different message types
            if (data.type === 'file_changes') {
              // console.log('File changes received:', data)
              
              // Use our enhanced handleFileChanges function to process all changes at once
              // This will handle swap files, backup files, and save patterns properly
              handleFileChanges(data.changes)
            } 
            // Handle specific file content update messages
            else if (data.type === 'file_content_updated') {
              // console.log('Specific file content updated:', data.path)
              
              // Update the file content in the store
              if (data.path && data.content) {
                get().handleFileChange(data.path, data.content, data.metadata || {})
              }
            }
            // Handle initial file content response
            else if (data.type === 'file_content') {
              // console.log('Initial file content received:', data.path)
              
              // Store the initial file content
              if (data.path && data.content) {
                get().handleFileChange(data.path, data.content, data.metadata || {})
              }
            }
          } catch (err) {
            // console.error('Error processing WebSocket message:', err)
          }
        }
        
        // Add to active connections when connected
        newSocket.onopen = () => {
          set(state => ({
            activeConnections: new Set([...state.activeConnections, directory]),
            isConnecting: false,
            socket: newSocket
          }))
        }
        
        newSocket.onerror = (error) => {
          // console.error('WebSocket error:', error)
          set({ isConnecting: false })
        }
        
        newSocket.onclose = () => {
          // console.log('WebSocket closed')
          set(state => {
            const newConnections = new Set(state.activeConnections)
            newConnections.delete(directory)
            return {
              activeConnections: newConnections,
              isConnecting: false,
              socket: null
            }
          })
        }
        
        set({ socket: newSocket })
      } else if (socket.readyState === WebSocket.OPEN) {
        // If we already have an open socket, just add this directory to the watched list
        socket.send(JSON.stringify({
          type: 'watch',
          directory
        }))
        
        set(state => ({
          activeConnections: new Set([...state.activeConnections, directory]),
          isConnecting: false
        }))
      }
    } catch (error) {
      // console.error('Error connecting to file watcher:', error)
      set({ isConnecting: false })
    }
  },

  disconnectFromFileWatcher: (directory: string) => {
    const { activeConnections, socket } = get()
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Remove this directory from the watched list
      const newConnections = new Set(activeConnections)
      newConnections.delete(directory)
      
      set({ activeConnections: newConnections })
      
      // If we're not watching any directories anymore, close the socket
      if (newConnections.size === 0) {
        socket.close()
        set({ socket: null })
      }
    }
  },

  handleFileChange: (path: string, newContent: string, metadata: any) => {
    // Check if we have this file in our store
    const currentFile = get().files[path]
    const recentlySavedFiles = get().recentlySavedFiles
    
    // Check if this file was recently saved (within last 2 seconds)
    const lastSaveTime = recentlySavedFiles.get(path)
    const now = Date.now()
    
    if (lastSaveTime && now - lastSaveTime < 2000) {
      // console.log(`[FILE CHANGE] Skipping update for ${path} - file was recently saved (${now - lastSaveTime}ms ago)`)
      return // Skip update if file was recently saved
    }
    
    // Check if this is a pipeline file (.flow or .pipeline extension)
    const isPipelineFile = path.endsWith('.flow') || path.endsWith('.pipeline')
    
    if (currentFile) {
      // console.log(`Updating file content for ${path} from backend change`)
      
      // For pipeline files, do additional checks to prevent overwriting newer content
      if (isPipelineFile && currentFile.content) {
        try {
          // Parse both current and new content to compare node counts
          const currentData = JSON.parse(currentFile.content)
          const newData = JSON.parse(newContent)
          
          // If current content has more nodes than incoming content, it's likely newer
          if (currentData.nodes && newData.nodes && 
              currentData.nodes.length > newData.nodes.length) {
            // console.log(`[FILE CHANGE] Rejecting update for ${path} - current version has more nodes (${currentData.nodes.length}) than incoming version (${newData.nodes.length})`)
            return // Skip update to preserve the version with more nodes
          }
          
          // If current content has a _saveTimestamp that's newer than incoming content
          if (currentData._saveTimestamp && newData._saveTimestamp && 
              currentData._saveTimestamp > newData._saveTimestamp) {
                      // console.log(`[FILE CHANGE] Rejecting update for ${path} - current version has newer timestamp`)
            return // Skip update to preserve newer version
          }
        } catch (e: any) {
          // If parsing fails, fall back to normal behavior
          // console.log(`[FILE CHANGE] Error parsing JSON for comparison: ${e.message}`)
        }
      }
      
      // Check if the content has actually changed
      if (currentFile.content !== newContent) {
        // Update the file in the store
        set(state => ({
          files: {
            ...state.files,
            [path]: {
              path,
              content: newContent,
              originalContent: newContent, // Update original content reference
              metadata,
              lastUpdated: Date.now(),
              // Check if content contains conflict markers
              hasConflicts: newContent.includes('<<<<<<< FRONTEND CHANGES') || 
                          newContent.includes('>>>>>>> BACKEND CHANGES')
            }
          }
        }))
        
        // Dispatch a custom event to notify components about the file change
        // This allows the EditorWindow to update its content if this file is currently open
        const event = new CustomEvent('file-content-changed', { 
          detail: { path, content: newContent, metadata } 
        })
        window.dispatchEvent(event)
      }
    }
  },
  
  // Add a file path to the active tabs list
  addActiveTab: (filePath: string) => {
    // Add to active tabs
    const activeTabs = new Set(get().activeTabs)
    activeTabs.add(filePath)
    set({ activeTabs })
    
    // Ensure the directory containing this file is being watched
    const lastSlashIndex = filePath.lastIndexOf('/')
    if (lastSlashIndex >= 0) {
      const directory = filePath.substring(0, lastSlashIndex)
      get().connectToFileWatcher(directory)
        .catch(err => console.error(`Failed to watch directory for active tab: ${err}`))
    }
    
    // Also watch this specific file
    get().watchFile(filePath)
      .catch(err => console.error(`Failed to watch specific file: ${err}`))
  },
  
  // Remove a file path from the active tabs list
  removeActiveTab: (filePath: string) => {
    const activeTabs = new Set(get().activeTabs)
    activeTabs.delete(filePath)
    set({ activeTabs })
    
    // Check if we need to stop watching the directory
    const lastSlashIndex = filePath.lastIndexOf('/')
    if (lastSlashIndex >= 0) {
      const directory = filePath.substring(0, lastSlashIndex)
      
      // Check if any other active tabs are in this directory
      let shouldDisconnect = true
      for (const tabPath of activeTabs) {
        if (tabPath && tabPath.startsWith(directory)) {
          shouldDisconnect = false
          break
        }
      }
      
      if (shouldDisconnect) {
        get().disconnectFromFileWatcher(directory)
      }
    }
  },
  
  // Watch all files in active tabs
  watchActiveTabFiles: () => {
    const { activeTabs } = get()
    
    if (!activeTabs || activeTabs.size === 0) {
      // console.log('No active tabs to watch')
      return
    }
    
    // console.log(`Watching ${activeTabs.size} active tab files`)
    
    // Create a set of unique directories to watch
    const directories = new Set<string>()
    const validFilePaths: string[] = []
    
    // First pass: collect valid file paths and their directories
    for (const filePath of activeTabs) {
      if (filePath) {
        validFilePaths.push(filePath)
        const lastSlashIndex = filePath.lastIndexOf('/')
        const directory = lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex) : ''
        if (directory) {
          directories.add(directory)
        }
      }
    }
    
    // Connect to each directory first (in parallel)
    const directoryPromises = Array.from(directories).map(directory => {
      return get().connectToFileWatcher(directory)
        .catch(err => {
          console.error(`Failed to watch directory: ${directory}, error: ${err}`)
          // Return the error to handle it in Promise.allSettled
          return Promise.reject(err)
        })
    })
    
    // Wait for all directory connections to be attempted
    Promise.allSettled(directoryPromises).then(() => {
      // Now watch each specific file
      validFilePaths.forEach(filePath => {
        get().watchFile(filePath)
          .catch(err => console.error(`Failed to watch specific file: ${filePath}, error: ${err}`))
      })
    })
    
    // Set up a periodic check to ensure files are being watched
    const periodicCheck = () => {
      const socket = get().socket
      if (socket && socket.readyState === WebSocket.OPEN) {
        // console.log('Refreshing file watches for active tabs')
        validFilePaths.forEach(filePath => {
          // Re-send watch requests for each file
          // We need to get the socket again to ensure it's still valid
          const currentSocket = get().socket
          if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            currentSocket.send(JSON.stringify({
              type: 'watch_file',
              path: filePath
            }))
          }
        })
      }
    }
    
    // Check every 30 seconds to ensure files are still being watched
    const intervalId = setInterval(periodicCheck, 30000)
    
    // Clear the interval when the component unmounts
    // This would need to be handled by the component that calls watchActiveTabFiles
    // For now, we'll clear any existing interval
    if ((window as any)._fileWatchInterval) {
      clearInterval((window as any)._fileWatchInterval)
    }
    (window as any)._fileWatchInterval = intervalId
  },
  
  // Watch a specific file for changes
  watchFile: async (filePath: string): Promise<void> => {
    // Ensure we have a valid file path
    if (!filePath) {
      console.error('Cannot watch file: No file path provided')
      return
    }
    
    // Also immediately fetch the current content to ensure we have the latest version
    try {
      const token = authService.getToken();
      const lastSlashIndex = filePath.lastIndexOf('/')
      const rootPath = lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex) : ''
      
      const response = await fetch(
        `http://localhost:8000/api/v1/file-explorer/file-content?path=${encodeURIComponent(filePath)}&root_path=${encodeURIComponent(rootPath)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        get().handleFileChange(filePath, data.content, data.metadata || {})
        // console.log(`Fetched initial content for ${filePath}`)
      }
    } catch (fetchError) {
      console.error(`Error fetching initial content for ${filePath}:`, fetchError)
      // Continue with watching even if fetch fails
    }
    
    try {
      // If no socket or not open, connect to the directory first
      if (!get().socket || get().socket?.readyState !== WebSocket.OPEN) {
        const lastSlashIndex = filePath.lastIndexOf('/')
        if (lastSlashIndex >= 0) {
          const directory = filePath.substring(0, lastSlashIndex)
          await get().connectToFileWatcher(directory)
        }
      }
      
      const socket = get().socket
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected')
      }
      
      // Send request to watch this specific file
      socket.send(JSON.stringify({
        type: 'watch_file',
        path: filePath
      }))
      
      // console.log(`Started watching specific file: ${filePath}`)
      
      // Also watch for any potential swap files that might indicate changes
      // This helps with editors like Vim that use swap files
      const fileDir = filePath.substring(0, filePath.lastIndexOf('/'))
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
      const swapFilePath = `${fileDir}/.${fileName}.swp`
      
      // Watch the swap file too if it's different from the original file
      if (swapFilePath !== filePath) {
        socket.send(JSON.stringify({
          type: 'watch_file',
          path: swapFilePath
        }))
        // console.log(`Also watching swap file: ${swapFilePath}`)
      }
      
      // Add an event listener to check if the socket closes and try to reconnect
      const checkSocketStatus = () => {
        const currentSocket = get().socket
        if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
          // console.log(`Socket closed, attempting to reconnect and watch ${filePath} again`)
          // Try to reconnect and watch the file again
          get().watchFile(filePath).catch(err => 
            console.error(`Failed to re-watch file after socket closed: ${err}`)
          )
        }
      }
      
      // Check socket status after a delay to ensure it stays connected
      setTimeout(checkSocketStatus, 5000)
    } catch (error) {
      console.error(`Error watching file ${filePath}:`, error)
      // Schedule a retry after a delay
      setTimeout(() => {
        // console.log(`Retrying to watch file: ${filePath}`)
        get().watchFile(filePath).catch(err => 
          console.error(`Failed to retry watching file: ${err}`)
        )
      }, 3000)
    }
  }
}))

// Helper function to process file changes from WebSocket
function handleFileChanges(changes: any[]) {
  const store = useFileContentStore.getState()
  
  // Track files that need content updates
  const filesToUpdate = new Set<string>();
  const backupFiles = new Set<string>();
  const normalizedChanges = new Map<string, any[]>();
  
  // First pass: categorize changes and normalize file paths
  changes.forEach(change => {
    if (!change.path) return
    
    // Get the actual file path (not the swap file)
    let filePath = change.path
    let isSwapFile = false
    let isBackupFile = false
    
    // Handle various swap file patterns (.swp, .swx, etc.)
    if (filePath.includes('.sw')) {
      // Extract the actual file name from the swap file
      const match = filePath.match(/\.([^.]+)\.sw[px]$/)
      if (match) {
        const actualFileName = match[1]
        filePath = filePath.replace(/\.[^.]+\.sw[px]$/, `.${actualFileName}`)
        // console.log(`Detected swap file change, mapped to actual file: ${filePath}`)
        isSwapFile = true
      }
    }
    
    // Handle backup files (file~)
    if (filePath.endsWith('~')) {
      const actualFilePath = filePath.slice(0, -1)
      // console.log(`Detected backup file: ${filePath}, mapped to: ${actualFilePath}`)
      filePath = actualFilePath
      isBackupFile = true
      backupFiles.add(actualFilePath)
    }
    
    // Skip Vim temporary files (4913, swap files, etc.)
    if (filePath.endsWith('/4913') || 
        filePath === '/4913' || 
        filePath.includes('4913') || 
        /\/\..*\.sw[px]$/.test(filePath)) { // Better regex for swap files
      // console.log(`Skipping Vim temporary file: ${filePath}`)
      return
    }
    
    // Group changes by normalized file path
    if (!normalizedChanges.has(filePath)) {
      normalizedChanges.set(filePath, [])
    }
    normalizedChanges.get(filePath)?.push({
      ...change,
      type: change.type,
      isSwapFile,
      isBackupFile
    })
    
    // Mark file for update if it's added or modified
    if (change.type === 'ADDED' || change.type === 'MODIFIED') {
      filesToUpdate.add(filePath)
    }
    
    // Also mark file for update if its swap file was deleted (likely saved)
    if (isSwapFile && change.type === 'DELETED') {
      filesToUpdate.add(filePath)
    }
  })
  
  // Second pass: analyze change patterns to detect save operations
  normalizedChanges.forEach((fileChanges, filePath) => {
    // Check for the "delete original + add new" pattern (common in editors like vim)
    const hasDelete = fileChanges.some(c => c.type === 'DELETED' && !c.isSwapFile && !c.isBackupFile)
    const hasAdd = fileChanges.some(c => c.type === 'ADDED' && !c.isSwapFile && !c.isBackupFile)
    
    if (hasDelete && hasAdd) {
      // console.log(`Detected save pattern for file: ${filePath}`)
      filesToUpdate.add(filePath)
    }
    
    // If we see backup file operations, that's also a sign of a save
    if (backupFiles.has(filePath)) {
      // console.log(`Detected backup file operations for: ${filePath}`)
      filesToUpdate.add(filePath)
    }
  })
  
  // Finally, update all files that need updating
  filesToUpdate.forEach(async (filePath) => {
    try {
      // Re-fetch the file content
      const lastSlashIndex = filePath.lastIndexOf('/')
      const rootPath = lastSlashIndex >= 0 ? filePath.substring(0, lastSlashIndex) : ''
      
      // Check if this is a file we're tracking before fetching
      const files = store.files
      const activeTabs = store.activeTabs
      
      // Only fetch content for tracked files or active tabs
      if ((files && filePath in files) || (activeTabs && activeTabs.has(filePath))) {
        // console.log(`Refreshing content for file: ${filePath}`)
        await store.getFileContent(filePath, rootPath, true)
        // console.log(`Updated content for file: ${filePath}`)
      } else {
        // console.log(`Skipping update for untracked file: ${filePath}`)
      }
    } catch (err) {
      // console.error(`Error re-fetching file content after change for ${filePath}:`, err)
    }
  })
}
