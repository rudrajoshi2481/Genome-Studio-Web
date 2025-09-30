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
  
  const { removeTab, saveTab } = useTabStore()
  
  const handleSaveAndClose = () => {
    if (pendingTabToClose) {
      // Mark tab as saved (remove dirty flag)
      saveTab(pendingTabToClose)
      // Then close the tab
      handleConfirmClose()
    }
  }
  
  const handleConfirmClose = () => {
    if (pendingTabToClose) {
      // Use the store's forceRemoveTab method
      const { forceRemoveTab } = useTabStore.getState()
      forceRemoveTab(pendingTabToClose)
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
        onSave={handleSaveAndClose}
        onConfirm={handleConfirmClose}
      />
    </>
  )
}

export default DialogProvider
