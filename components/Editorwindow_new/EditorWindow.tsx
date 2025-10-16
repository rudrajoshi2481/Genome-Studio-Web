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
  // Get tab store methods
  const { getActiveTab, removeTab, activateTab } = useTabStore()
  
  // Get active tab from the store
  const activeTab = getActiveTab()
  const [isMounted, setIsMounted] = React.useState(false)
  
  // Handle client-side mounting to prevent hydration mismatch
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Tab handlers
  const handleTabClose = useCallback((tabId: string) => {
    removeTab(tabId)
  }, [removeTab])

  const handleTabActivate = useCallback((tabId: string) => {
    activateTab(tabId)
  }, [activateTab])
  
  // Show consistent loading state during SSR and initial client render
  if (!isMounted) {
    return (
      <div className='flex flex-col h-full'>
        {/* <div className='flex items-center justify-center h-full text-gray-500 flex-col'>
          <div className="animate-pulse">
            <div className="w-96 h-96 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
          </div>
        </div> */}
      </div>
    )
  }
  
  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {activeTab ? (
        <div className='flex-1 overflow-hidden'>
          <EditorFactory 
            tabId={activeTab.id}
            filePath={activeTab.path}
            extension={activeTab.extension}
          />
        </div>
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
  const { getActiveTab, removeTab, activateTab, getTab } = useTabStore()
  const { openUnsavedChangesDialog } = useDialogStore()
  
  // Get active tab
  const activeTab = getActiveTab()
  
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
            {allTabs.map(tab => (
              <FileTab 
                key={tab.id}
                id={tab.id} 
                name={tab.name} 
                path={tab.path} 
                extension={tab.extension}
                isActive={activeTab?.id === tab.id}
                isDirty={tab.isDirty}
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
