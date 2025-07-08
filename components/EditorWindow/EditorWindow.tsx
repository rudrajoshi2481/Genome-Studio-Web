import React, { memo, useCallback } from 'react'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'
import FileTabs from '../FileTabs/FileTabs'
import DialogProvider from '../FileTabs/DialogProvider'
import Canvas from './Canvas/Canvas'
import { Badge } from '@/components/ui/badge'
import { host, port } from '@/config/server'; 
import CodeEditor from './CodeEditor/CodeEditor'
import FileTab from '../FileTabs/FileTab'
import Image from 'next/image'
import ImageExtension from './Extensions/ImageExtension'


/**
 * EditorWindowContent component that renders the main editor interface
 * Optimized to minimize state and re-renders
 */
const EditorWindowContent = memo(() => {
  // Get tab store methods
  const { getActiveTab, removeTab } = useTabStore()
  
  // Get active tab from the store
  const activeTab = getActiveTab()
  
  // Tab handlers
  const handleTabClose = useCallback((tabId: string) => {
    removeTab(tabId)
  }, [removeTab])
  
  // Render the appropriate editor based on file extension
  const renderEditor = () => {
    if (!activeTab) return null
    
    if (activeTab.extension === 'flow' || activeTab.extension === 'pipeline') {
      return (
        <div className='h-full overflow-auto'>
          <Canvas 
            tabId={activeTab.id}
          />
        </div>
      )
    }
    
    // For image files, use the ImageExtension component
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    if (activeTab.extension && imageExtensions.includes(activeTab.extension.toLowerCase())) {
      return (
        <div className='h-full'>
          <ImageExtension 
            tabId={activeTab.id}
          />
        </div>
      )
    }
    
    // For code files, use the CodeEditor component
    return (
      <div className='h-full'>
        <CodeEditor 
          tabId={activeTab.id} 
        />
      </div>
    )
  }
  
  return (
    <div className='flex flex-col h-full'>
      
      
      {activeTab ? (
        <div className='flex-1 relative'>
          {renderEditor()}
        </div>
      ) : (
        <div className='flex items-center justify-center h-full text-gray-500 flex-col'>
          <Image src="/Charco-High-Five.png" alt="No file selected" width={400} height={400} />
          <p className="text-sm text-gray-500 mt-2">Select a file to start editing</p>
        </div>
      )}
    </div>
  )
})

// Add display name for better debugging
EditorWindowContent.displayName = 'EditorWindowContent'

/**
 * EditorWindowStore component that provides dialog context to the editor
 */
const EditorWindowStore = () => {
  // Get tab store methods
  const { getActiveTab, removeTab, activateTab } = useTabStore()
  
  // Get active tab
  const activeTab = getActiveTab()
  
  // Tab handlers
  const handleActivate = useCallback((tabId: string) => {
    activateTab(tabId)
  }, [activateTab])
  
  const handleClose = useCallback((tabId: string) => {
    removeTab(tabId)
  }, [removeTab])
  
  // Get all tabs
  const allTabs = useTabStore(state => state.getAllTabs())
  
  return (
    <DialogProvider>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
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
      <EditorWindowContent />
    </DialogProvider>
  )
}

export default EditorWindowStore
