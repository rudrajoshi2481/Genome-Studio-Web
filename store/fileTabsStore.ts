import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface FileTab {
  id: string
  name: string
  path: string
  isDirty?: boolean
}

interface FileTabsState {
  openTabs: FileTab[]
  activeTabId: string | null
  addTab: (file: { name: string; path: string }) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
}

export const useFileTabsStore = create<FileTabsState>((set) => ({
  openTabs: [],
  activeTabId: null,
  addTab: (file) => set((state) => {
    // Check if file is already open
    const existingTab = state.openTabs.find(tab => tab.path === file.path)
    if (existingTab) {
      set({ activeTabId: existingTab.id })
      return state
    }

    const newTab = {
      id: uuidv4(),
      name: file.name,
      path: file.path,
      isDirty: false
    }

    return {
      openTabs: [...state.openTabs, newTab],
      activeTabId: newTab.id
    }
  }),
  removeTab: (id) => set((state) => {
    const newTabs = state.openTabs.filter(tab => tab.id !== id)
    const wasActive = state.activeTabId === id
    
    return {
      openTabs: newTabs,
      activeTabId: wasActive 
        ? newTabs.length > 0 
          ? newTabs[newTabs.length - 1].id 
          : null
        : state.activeTabId
    }
  }),
  setActiveTab: (id) => set({ activeTabId: id })
}))
