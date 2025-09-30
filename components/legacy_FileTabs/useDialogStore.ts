import { create } from 'zustand'

interface DialogState {
  isUnsavedChangesDialogOpen: boolean
  pendingTabToClose: string | null
  fileName: string
  
  // Actions
  openUnsavedChangesDialog: (tabId: string, fileName: string) => void
  closeUnsavedChangesDialog: () => void
  getPendingTabToClose: () => string | null
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isUnsavedChangesDialogOpen: false,
  pendingTabToClose: null,
  fileName: '',
  
  openUnsavedChangesDialog: (tabId, fileName) => {
    set({
      isUnsavedChangesDialogOpen: true,
      pendingTabToClose: tabId,
      fileName
    })
  },
  
  closeUnsavedChangesDialog: () => {
    set({
      isUnsavedChangesDialogOpen: false,
      pendingTabToClose: null,
      fileName: ''
    })
  },
  
  getPendingTabToClose: () => {
    return get().pendingTabToClose
  }
}))
