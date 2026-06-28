import React, { memo, useCallback } from 'react'
import { Dna, FolderOpen, Terminal, GitBranch } from 'lucide-react'
import { useTabStore } from '@/components/FileTabs/useTabStore'
import type { TabFile } from '@/components/FileTabs/useTabStore'
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
        <div className="flex flex-1 items-center justify-center h-full overflow-hidden bg-gray-50/50">
          <div className="flex flex-col items-center gap-6 text-center px-8 max-w-md">
            <Dna className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-700 tracking-tight">
                No File Open
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Open a file from the explorer to start editing, or create a new workflow to begin analyzing your data.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Browse files
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Open terminal
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                Git status
              </span>
            </div>
          </div>
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
  const activeTabId = useTabStore(state => state.activeTabId)
  
  // Get active tab using selector to prevent infinite loops
  const activeTab = useTabStore(state => {
    if (!state.activeTabId) return null
    return state.tabs.get(state.activeTabId) || null
  })

  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Scroll active tab into view
  const tabBarRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!activeTabId || !tabBarRef.current) return
    const activeEl = tabBarRef.current.querySelector(`[data-tab-id="${activeTabId}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])
  
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
  
  // Get all tabs - use primitive selectors to avoid infinite re-renders
  const tabOrder = useTabStore(state => state.tabOrder)
  const tabs = useTabStore(state => state.tabs)
  const allTabs = tabOrder.map(id => tabs.get(id)).filter(Boolean) as TabFile[]
  
  return (
    <EditorProvider>
      <DialogProvider>
        <div className="h-full w-full flex flex-col overflow-hidden">  
          {/* Tab bar */}
          <div ref={tabBarRef} className="flex border-b border-gray-200 overflow-x-auto flex-shrink-0 tab-scroll-container">
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
