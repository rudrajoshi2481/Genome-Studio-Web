import React from 'react'
import { useDialogStore } from './useDialogStore'
import { useTabStore } from './useTabStore'
import UnsavedChangesDialog from './UnsavedChangesDialog'

interface DialogProviderProps {
  children: React.ReactNode
}

const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const { 
    isUnsavedChangesDialogOpen, 
    pendingTabToClose, 
    fileName, 
    closeUnsavedChangesDialog 
  } = useDialogStore()
  
  const { removeTab } = useTabStore()
  
  const handleConfirmClose = () => {
    if (pendingTabToClose) {
      // Force close the tab without checking isDirty again
      const state = useTabStore.getState()
      const tab = state.tabs.get(pendingTabToClose)
      
      if (tab) {
        const newTabs = new Map(state.tabs)
        newTabs.delete(pendingTabToClose)
        
        const newTabOrder = state.tabOrder.filter(id => id !== pendingTabToClose)
        
        // Handle active tab removal
        let newActiveTabId = state.activeTabId
        if (state.activeTabId === pendingTabToClose) {
          const currentIndex = state.tabOrder.indexOf(pendingTabToClose)
          if (newTabOrder.length > 0) {
            // Try to activate the tab to the right, or if not available, the tab to the left
            const nextIndex = Math.min(currentIndex, newTabOrder.length - 1)
            newActiveTabId = newTabOrder[nextIndex]
          } else {
            newActiveTabId = null
          }
        }
        
        useTabStore.setState({ 
          tabs: newTabs,
          tabOrder: newTabOrder,
          activeTabId: newActiveTabId
        })
      }
    }
    
    closeUnsavedChangesDialog()
  }
  
  return (
    <>
      {children}
      
      <UnsavedChangesDialog
        isOpen={isUnsavedChangesDialogOpen}
        fileName={fileName}
        onClose={closeUnsavedChangesDialog}
        onConfirm={handleConfirmClose}
      />
    </>
  )
}

export default DialogProvider
