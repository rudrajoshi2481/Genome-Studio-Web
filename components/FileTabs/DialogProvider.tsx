import React from 'react'
import { useDialogStore } from './useDialogStore'
import { useTabStore } from './useTabStore'
import { useEditorContext } from '../Editorwindow_new/context/EditorContext'
import UnsavedChangesDialog from './UnsavedChangesDialog'
import { toast } from 'sonner'

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
  
  const { forceRemoveTab } = useTabStore()
  const { saveTab } = useEditorContext()
  
  const handleSaveAndClose = async () => {
    if (pendingTabToClose) {
      console.log('💾 DialogProvider: Attempting to save tab:', pendingTabToClose)
      
      // Actually save the file content using the editor's save callback
      const saved = await saveTab(pendingTabToClose)
      
      console.log('💾 DialogProvider: Save result:', saved)
      
      if (saved) {
        toast.success('File saved successfully')
        // Then close the tab
        handleConfirmClose()
      } else {
        // If save failed, show error and keep dialog open
        toast.error('Failed to save file')
        console.error('❌ DialogProvider: Failed to save file')
      }
    }
  }
  
  const handleConfirmClose = () => {
    if (pendingTabToClose) {
      // Force remove the tab without checking dirty state
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
