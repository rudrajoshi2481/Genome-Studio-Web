import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthToken } from '@/lib/stores/auth-store'
import { useFileContentStore } from '@/lib/stores/file-content-store'
import FileTabsStore from '../FileTabs/FileTabs'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'
import CodeEditor from './CodeEditor/CodeEditor'
import DialogProvider from '../FileTabs/DialogProvider'

import { debounce } from 'lodash'


import path from 'path'
import { Canvas } from './Canvas'


function EditorWindowContent() {
  const [activeContent, setActiveContent] = useState<string>('')
  const [lastSavedContent, setLastSavedContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasConflicts, setHasConflicts] = useState<boolean>(false)
  
  // Get store methods with memoization
  const tabStore = useTabStore()
  const { getActiveTab, updateTabContent, setTabDirty, removeTab } = tabStore
  
  // Get active tab from the store
  const activeTab = getActiveTab()
  
  // Get file content store methods
  const { 
    getFileContent, 
    updateFileContent, 
    connectToFileWatcher, 
    disconnectFromFileWatcher, 
    files,
    addActiveTab,
    removeActiveTab
  } = useFileContentStore()
  
  // Memoized values
  const hasUnsavedChanges = useMemo(() => {
    return activeContent !== lastSavedContent && activeContent.trim() !== ''
  }, [activeContent, lastSavedContent])
  
  // Debounced content change handler to reduce excessive updates
  const debouncedContentUpdate = useCallback(
    debounce((content: string, tabId: string) => {
      updateTabContent(tabId, content)
      setTabDirty(tabId, content !== lastSavedContent)
    }, 300),
    [updateTabContent, setTabDirty, lastSavedContent]
  )

  // Fetch file content when active tab changes
  useEffect(() => {
    if (!activeTab?.path) return
    
    const rootPath = path.dirname(activeTab.path)
    
    // Register this file as an active tab
    addActiveTab(activeTab.path)
    
    // Connect to file watcher for the directory
    connectToFileWatcher(rootPath)
    
    // Load file content when tab changes
    setIsLoading(true)
    setError(null)
    
    // Check if we already have the content in the store
    const cachedContent = files[activeTab.path]
    if (cachedContent) {
      setActiveContent(cachedContent.content)
      setLastSavedContent(cachedContent.content)
      updateTabContent(activeTab.id, cachedContent.content)
      
      // Check if file has conflicts
      if (cachedContent.hasConflicts) {
        setHasConflicts(true)
        setError('This file contains merge conflicts that need to be resolved')
      } else {
        setHasConflicts(false)
      }
      
      setIsLoading(false)
    } else {
      // Fetch file content
      getFileContent(activeTab.path, rootPath)
        .then(fileContent => {
          setActiveContent(fileContent.content)
          setLastSavedContent(fileContent.content)
          updateTabContent(activeTab.id, fileContent.content)
          
          // Check if file has conflicts
          if (fileContent.hasConflicts) {
            setHasConflicts(true)
            setError('This file contains merge conflicts that need to be resolved')
          } else {
            setHasConflicts(false)
          }
        })
        .catch((err: Error) => {
          console.error('Error fetching file content:', err)
          setError(`Failed to load file: ${err.message}`)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
    
    // Listen for file content changes from backend
    const handleFileContentChanged = (event: CustomEvent) => {
      const { path: changedPath, content, metadata } = event.detail
      
      // Only update if this is the active file
      if (changedPath === activeTab.path) {
        console.log('File content changed from backend:', changedPath)
        
        // Update editor content
        setActiveContent(content)
        setLastSavedContent(content)
        updateTabContent(activeTab.id, content)
        
        // Check if content has conflicts
        const hasConflicts = content.includes('<<<<<<< FRONTEND CHANGES') || 
                           content.includes('>>>>>>> BACKEND CHANGES')
        
        if (hasConflicts) {
          setHasConflicts(true)
          setError('This file contains merge conflicts that need to be resolved')
        } else {
          setHasConflicts(false)
        }
      }
    }
    
    // Add event listener for file content changes
    window.addEventListener('file-content-changed', handleFileContentChanged as EventListener)
    
    return () => {
      // Unregister this file as an active tab
      if (activeTab?.path) {
        removeActiveTab(activeTab.path)
      }
      
      // Remove event listener
      window.removeEventListener('file-content-changed', handleFileContentChanged as EventListener)
    }
  }, [activeTab?.path, activeTab?.id, connectToFileWatcher, disconnectFromFileWatcher, files, getFileContent, updateTabContent]) // Only depend on id and path to avoid excessive re-renders
  
  // Memoized handlers
  const handleTabChange = useCallback((tabId: string, tab: TabFile) => {
    setActiveContent(tab.content || '')
    setLastSavedContent(tab.content || '')
  }, [])

  const handleTabClose = useCallback((tabId: string, tab: TabFile) => {
      removeTab(tabId)
  }, [removeTab])
  
  // Save file content to backend
  const saveFileContent = useCallback(async () => {
    if (!activeTab?.path || activeContent === lastSavedContent) return
    
    try {
      setIsLoading(true)
      const rootPath = path.dirname(activeTab.path)
      
      const result = await updateFileContent(activeTab.path, activeContent, rootPath)
      
      // Handle merge results
      if (result.merged) {
        // Update content with merged version
        setActiveContent(result.content)
        
        if (result.hasConflicts) {
          setHasConflicts(true)
          setError('Merge conflicts detected. Please resolve conflicts before continuing.')
        } else {
          setHasConflicts(false)
          setError(null)
        }
      }
      
      setLastSavedContent(result.content)
      setTabDirty(activeTab.id, result.hasConflicts) // Keep tab dirty if there are conflicts
    } catch (err: unknown) {
      console.error('Error saving file:', err)
      setError(`Failed to save file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab?.path, activeContent, lastSavedContent, updateFileContent])
  
  // Optimized content change handler
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeTab) return
    
    // Only update if content actually changed
    if (newContent === activeContent) return
    
    setActiveContent(newContent)
    debouncedContentUpdate(newContent, activeTab.id)
  }, [activeTab?.id, activeContent, debouncedContentUpdate])
  
  // Memoized editor component
  const EditorComponent = useMemo(() => {
    if (!activeTab) return null
    
    if (activeTab.extension === 'flow') {
      return (
        <div className='h-full overflow-auto'>
          <Canvas 
            fileContent={activeContent} 
            activePath={activeTab.path} 
            onContentChange={handleContentChange}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={saveFileContent}
          />
        </div>
      )
    }
    
    return (
      <div className='h-full overflow-auto'>
        <CodeEditor 
          content={activeContent}
          onChange={handleContentChange}
          extension={activeTab.extension || ''}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
    )
  }, [activeTab?.extension, activeContent, handleContentChange, hasUnsavedChanges])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save on Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFileContent()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFileContent])
  
  return (
    <div className='flex flex-col h-full'>
      <FileTabsStore 
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
      />
      
      {activeTab ? (
        <div className='flex-1 overflow-auto relative'>
          {isLoading && (
            <div className='absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 text-xs m-1 rounded-md'>
              {lastSavedContent === '' ? 'Loading...' : 'Saving...'}
            </div>
          )}
          
          {error && (
            <div className='absolute top-0 right-0 bg-red-500 text-white px-2 py-1 text-xs m-1 rounded-md'>
              {error}
            </div>
          )}
          
          {hasConflicts && (
            <div className='absolute top-0 left-0 bg-yellow-500 text-white px-2 py-1 text-xs m-1 rounded-md flex items-center'>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Merge Conflicts</span>
              <button 
                onClick={saveFileContent}
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-0.5 rounded"
                title="Resolve conflicts and save"
              >
                Resolve
              </button>
            </div>
          )}
          
          {hasUnsavedChanges && (
            <button 
              onClick={saveFileContent}
              className='absolute top-0 right-0 bg-green-500 hover:bg-green-600 text-white px-2 py-1 text-xs m-1 rounded-md'
            >
              Save
            </button>
          )}
          
          {EditorComponent}
        </div>
      ) : (
        <div className='flex items-center justify-center h-full text-gray-500'>
          No file selected
        </div>
      )}
    </div>
  )
}

function EditorWindowStore() {
  return (
    <DialogProvider>
      <EditorWindowContent />
    </DialogProvider>
  )
}

export default EditorWindowStore
