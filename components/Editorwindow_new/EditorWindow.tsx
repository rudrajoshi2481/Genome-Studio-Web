import React, { memo, useCallback } from 'react'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import { useDialogStore } from '@/components/FileTabs/useDialogStore'
import DialogProvider from '../FileTabs/DialogProvider'
import FileTab from '../FileTabs/FileTab'
import { EditorProvider } from './context/EditorContext'
import EditorFactory from './components/EditorFactory'

/**
 * EditorWindowContent component that renders the main editor interface
 * Reimplemented to use new file-explorer-new API
 */
const EditorWindowContent = memo(() => {
  // Get active tab using selector to prevent infinite loops
  const activeTabId = useTabStore(state => state.activeTabId)
  const allTabs = useTabStore(state => state.getAllTabs())
  const [isMounted, setIsMounted] = React.useState(false)
  
  // Handle client-side mounting to prevent hydration mismatch
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Show consistent loading state during SSR and initial client render
  if (!isMounted) {
    return (
      <div className='flex flex-col h-full'>
      </div>
    )
  }
  
  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {allTabs.length > 0 ? (
        allTabs.map(tab => (
          <div
            key={tab.id}
            className='flex-1 overflow-hidden'
            style={{ display: tab.id === activeTabId ? 'flex' : 'none' }}
          >
            <EditorFactory 
              tabId={tab.id}
              filePath={tab.path}
              extension={tab.extension}
              isActive={tab.id === activeTabId}
            />
          </div>
        ))
      ) : (
        <div className='flex items-center justify-center h-full text-gray-500 flex-col overflow-hidden'>
          {/* Add skeleton */}
        </div>
      )}
    </div>
  )
})

// Add display name for better debugging
EditorWindowContent.displayName = 'EditorWindowContent'

/**
 * EditorWindow component that provides context and tab management
 * Uses new file-explorer-new API for all operations
 */
const EditorWindow = () => {
  // Get tab store methods
  const { removeTab, activateTab, getTab } = useTabStore()
  const { openUnsavedChangesDialog } = useDialogStore()
  
  // Get active tab using selector to prevent infinite loops
  const activeTab = useTabStore(state => {
    if (!state.activeTabId) return null
    return state.tabs.get(state.activeTabId) || null
  })

  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Tab handlers
  const handleActivate = useCallback((tabId: string) => {
    activateTab(tabId)
  }, [activateTab])
  
  const handleClose = useCallback((tabId: string) => {
    const success = removeTab(tabId)
    
    // If removeTab returns false, it means the tab is dirty
    // Open the unsaved changes dialog
    if (!success) {
      const tab = getTab(tabId)
      if (tab) {
        openUnsavedChangesDialog(tabId, tab.name)
      }
    }
  }, [removeTab, getTab, openUnsavedChangesDialog])
  
  // Get all tabs
  const allTabs = useTabStore(state => state.getAllTabs())
  
  return (
    <EditorProvider>
      <DialogProvider>
        <div className="h-full w-full flex flex-col overflow-hidden">  
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 overflow-x-auto flex-shrink-0">
            {isMounted && allTabs.map(tab => (
              <FileTab 
                key={tab.id}
                id={tab.id} 
                name={tab.name} 
                path={tab.path} 
                extension={tab.extension}
                isActive={activeTab?.id === tab.id}
                isDirty={tab.isDirty}
                isExecuting={tab.isExecuting}
                onActivate={handleActivate}
                onClose={handleClose}
              />
            ))}
          </div>
          
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <EditorWindowContent />
          </div>
        </div>
      </DialogProvider>
    </EditorProvider>
  )
}

export default EditorWindow
