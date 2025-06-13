import React, { useState, useEffect, useCallback } from 'react'
import FileTabsStore from '../FileTabs/FileTabs'
import { useTabStore, TabFile } from '@/components/FileTabs/useTabStore'
import FileService from '@/components/services/file-service'
import CodeEditor from './CodeEditor/CodeEditor'
import DialogProvider from '../FileTabs/DialogProvider'
import Canvas from '@/components/canvas/Canvas'


function EditorWindowContent() {
  const [activeContent, setActiveContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get store methods
  const { getAllTabs, addTab, getActiveTab, removeTab, updateTabContent, setTabDirty } = useTabStore()
  
  // Get active tab from the store
  const activeTab = getActiveTab()


  // Update content when active tab changes
  useEffect(() => {
    if (activeTab) {
      // If the tab has content already, use it
      if (activeTab.content) {
        setActiveContent(activeTab.content)
      } else {
        // Otherwise fetch content from the backend
        fetchFileContent(activeTab.path)
      }
    }
  }, [activeTab])
  
  // Function to fetch file content from backend
  const fetchFileContent = async (filePath: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`Fetching content for: ${filePath}`)
      const response = await FileService.getFileContent(filePath)
      console.log('Response received:', response)
      
      if (response.binary) {
        setActiveContent('[Binary file content not displayed]')
      } else if (response.truncated) {
        setActiveContent(`[File too large to display: ${response.metadata?.size || 'unknown'} bytes]`)
      } else {
        // Make sure we have content as a string
        const content = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content, null, 2)
        
        console.log('Setting content:', content.substring(0, 100) + '...')
        setActiveContent(content)
        
        // Update the tab content in the store
        if (activeTab) {
          updateTabContent(activeTab.id, content)
        }
      }
    } catch (err) {
      console.error('Error fetching file content:', err)
      setError(`Failed to load file: ${err instanceof Error ? err.message : String(err)}`)
      setActiveContent('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = (tabId: string, tab: TabFile) => {
    setActiveContent(tab.content || '')
  }

  const handleTabClose = (tabId: string, tab: TabFile) => {
    removeTab(tabId)
  }
  
  // Handle content changes made by the user
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeTab) return
    
    // Update content in state
    setActiveContent(newContent)
    
    // Update content in store
    updateTabContent(activeTab.id, newContent)
    
    // Mark tab as dirty since user made changes
    setTabDirty(activeTab.id, true)
  }, [activeTab, updateTabContent, setTabDirty])

  return (
    <div className='flex flex-col h-full'>
      <FileTabsStore 
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
      />
      
      {activeTab ? (
        <div className='flex-1 overflow-auto'>
          {isLoading ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4'></div>
                <p>Loading file content...</p>
              </div>
            </div>
          ) : error ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center text-red-500'>
                <p>{error}</p>
                <button 
                  onClick={() => activeTab && fetchFileContent(activeTab.path)}
                  className='mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : activeTab.extension === 'flow' ? (
            <div className='h-full overflow-auto'>
              <Canvas />
            </div>
          ) : (
            <div className='h-full overflow-auto'>
              <CodeEditor 
                content={activeContent}
                onChange={handleContentChange}
                extension={activeTab.extension || ''}
              />
            </div>
          )}
        </div>
      ) : (
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <h3 className='text-xl font-semibold mb-2'>No file selected</h3>
            <p>Open a file from the tabs above or from the file explorer</p>
          </div>
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
