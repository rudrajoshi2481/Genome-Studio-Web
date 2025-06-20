import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthToken } from '@/lib/stores/auth-store'
import FileTabsStore from '../FileTabs/FileTabs'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'
import CodeEditor from './CodeEditor/CodeEditor'
import DialogProvider from '../FileTabs/DialogProvider'

import { debounce } from 'lodash'

// Extracted components and hooks
import { useWebSocket } from './hooks/useWebSocket'
import { useFileContent } from './hooks/useFileContent'
import LoadingComponent from './components/LoadingComponent'
import ErrorComponent from './components/ErrorComponent'
import EmptyState from './components/EmptyState'
// import Canvas from './canvas/Canvas'


function EditorWindowContent() {
  const [activeContent, setActiveContent] = useState<string>('')
  const [lastSavedContent, setLastSavedContent] = useState<string>('')
  
  // Get store methods with memoization
  const tabStore = useTabStore()
  const { getAllTabs, addTab, getActiveTab, removeTab, updateTabContent, setTabDirty } = tabStore
  
  // Get active tab from the store
  const activeTab = getActiveTab()
  
  // Get authentication token
  const authToken = useAuthToken()
  
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

  // File content handling
  const handleContentUpdate = useCallback((content: string) => {
    setActiveContent(content)
    setLastSavedContent(content)
    
    // Update tab content in store
    if (activeTab) {
      updateTabContent(activeTab.id, content)
      setTabDirty(activeTab.id, false)
    }
  }, [activeTab, updateTabContent, setTabDirty])

  // Use file content hook
  const { isLoading, error, fetchFileContent, setError } = useFileContent({
    authToken,
    onContentUpdate: handleContentUpdate
  })

  // Use WebSocket hook
  const { isConnected } = useWebSocket({
    path: activeTab?.path,
    authToken,
    hasUnsavedChanges,
    onFileChange: fetchFileContent
  })
  
  // Update content when active tab changes
  useEffect(() => {
    if (activeTab) {
      if (activeTab.content && activeTab.content !== activeContent) {
        setActiveContent(activeTab.content)
        setLastSavedContent(activeTab.content)
      } else if (!activeTab.content) {
        fetchFileContent(activeTab.path)
      }
    }
  }, [activeTab?.id, activeTab?.path]) // Only depend on id and path to avoid excessive re-renders
  
  // Memoized handlers
  const handleTabChange = useCallback((tabId: string, tab: TabFile) => {
    setActiveContent(tab.content || '')
    setLastSavedContent(tab.content || '')
  }, [])

  const handleTabClose = useCallback((tabId: string, tab: TabFile) => {
    removeTab(tabId)
  }, [removeTab])
  
  // Optimized content change handler
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeTab) return
    
    // Only update if content actually changed
    if (newContent === activeContent) return
    
    setActiveContent(newContent)
    debouncedContentUpdate(newContent, activeTab.id)
  }, [activeTab?.id, activeContent, debouncedContentUpdate])
  
  // Retry handler
  const handleRetry = useCallback(() => {
    if (activeTab) {
      fetchFileContent(activeTab.path, true)
    }
  }, [activeTab?.path, fetchFileContent])
  
  // Memoized editor component
  const EditorComponent = useMemo(() => {
    if (!activeTab) return null
    
    if (activeTab.extension === 'flow') {
      return (
        <div className='h-full overflow-auto'>
          {/* <Canvas />/ */}
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

  return (
    <div className='flex flex-col h-full'>
      <FileTabsStore 
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
      />
      
      {activeTab ? (
        <div className='flex-1 overflow-auto'>
          {isLoading ? (
            <LoadingComponent isConnected={isConnected} />
          ) : error ? (
            <ErrorComponent error={error} onRetry={handleRetry} />
          ) : (
            EditorComponent
          )}
        </div>
      ) : (
        <EmptyState />
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
