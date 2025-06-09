import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Define the active file type
export interface ActiveFile {
  path: string
  name: string
  content?: string
  type?: string
  modified?: boolean
  lastAccessed?: number
  createdAt?: number
  size?: number
  language?: string
}

// Define the active files state
interface ActiveFilesState {
  // State
  activeFiles: ActiveFile[]
  activeFileIndex: number | null
  
  // Actions
  addFile: (file: ActiveFile) => void
  removeFile: (path: string) => void
  setActiveFile: (path: string) => void
  updateFileContent: (path: string, content: string) => void
  markFileAsModified: (path: string, isModified: boolean) => void
  updateFileMetadata: (path: string, metadata: Partial<ActiveFile>) => void
  clearAllFiles: () => void
}

// Create the store with persistence
export const useActiveFilesStore = create<ActiveFilesState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeFiles: [],
      activeFileIndex: null,
      
      // Add a new file to the active files list
      addFile: (file: ActiveFile) => set((state) => {
        // Check if file already exists
        const fileExists = state.activeFiles.some(f => f.path === file.path)
        
        if (fileExists) {
          // Update the lastAccessed timestamp
          return {
            activeFiles: state.activeFiles.map(f => 
              f.path === file.path 
                ? { ...f, lastAccessed: Date.now() } 
                : f
            ),
            activeFileIndex: state.activeFiles.findIndex(f => f.path === file.path)
          }
        } else {
          // Add new file with timestamps
          const newFile = { 
            ...file, 
            lastAccessed: Date.now(),
            createdAt: Date.now()
          }
          
          return {
            activeFiles: [...state.activeFiles, newFile],
            activeFileIndex: state.activeFiles.length
          }
        }
      }),
      
      // Remove a file from the active files list
      removeFile: (path: string) => set((state) => {
        const fileIndex = state.activeFiles.findIndex(f => f.path === path)
        
        if (fileIndex === -1) {
          return state
        }
        
        const newFiles = state.activeFiles.filter(f => f.path !== path)
        
        // Update active file index
        let newActiveIndex = state.activeFileIndex
        
        if (newFiles.length === 0) {
          // No files left
          newActiveIndex = null
        } else if (state.activeFileIndex === fileIndex) {
          // Removing the active file
          newActiveIndex = fileIndex >= newFiles.length 
            ? newFiles.length - 1 
            : fileIndex
        } else if (state.activeFileIndex !== null && state.activeFileIndex > fileIndex) {
          // Removing a file before the active file
          newActiveIndex = state.activeFileIndex - 1
        }
        
        return {
          activeFiles: newFiles,
          activeFileIndex: newActiveIndex
        }
      }),
      
      // Set the active file by path
      setActiveFile: (path: string) => set((state) => {
        const fileIndex = state.activeFiles.findIndex(f => f.path === path)
        
        if (fileIndex === -1) {
          return state
        }
        
        // Update lastAccessed timestamp for the file
        const updatedFiles = state.activeFiles.map((f, index) => 
          index === fileIndex 
            ? { ...f, lastAccessed: Date.now() } 
            : f
        )
        
        return {
          activeFiles: updatedFiles,
          activeFileIndex: fileIndex
        }
      }),
      
      // Update file content
      updateFileContent: (path: string, content: string) => set((state) => {
        return {
          activeFiles: state.activeFiles.map(f => 
            f.path === path 
              ? { ...f, content, lastAccessed: Date.now() } 
              : f
          )
        }
      }),
      
      // Mark a file as modified or not
      markFileAsModified: (path: string, isModified: boolean) => set((state) => {
        return {
          activeFiles: state.activeFiles.map(f => 
            f.path === path 
              ? { ...f, modified: isModified, lastAccessed: Date.now() } 
              : f
          )
        }
      }),
      
      // Update file metadata
      updateFileMetadata: (path: string, metadata: Partial<ActiveFile>) => set((state) => {
        return {
          activeFiles: state.activeFiles.map(f => 
            f.path === path 
              ? { ...f, ...metadata, lastAccessed: Date.now() } 
              : f
          )
        }
      }),
      
      // Clear all files
      clearAllFiles: () => set({
        activeFiles: [],
        activeFileIndex: null
      })
    }),
    {
      name: 'active-files-storage',
      partialize: (state) => ({
        activeFiles: state.activeFiles,
        activeFileIndex: state.activeFileIndex
      })
    }
  )
)

export default useActiveFilesStore
