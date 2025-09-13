import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { FileType } from '../utils/fileTypeDetector'

/**
 * Editor state management context for the new EditorWindow
 * Provides centralized state management for all editor instances
 */

// Editor state types
export interface EditorState {
  activeEditors: Map<string, EditorInstance>
  globalSettings: EditorSettings
  syncStatus: SyncStatus
}

export interface EditorInstance {
  tabId: string
  filePath: string
  fileType: FileType
  content: string
  isDirty: boolean
  isLoading: boolean
  error: string | null
  version: number
  lastSaved: Date | null
  cursorPosition?: { line: number; column: number }
  scrollPosition?: { top: number; left: number }
}

export interface EditorSettings {
  autoSave: boolean
  autoSaveInterval: number // milliseconds
  theme: 'light' | 'dark' | 'auto'
  fontSize: number
  tabSize: number
  wordWrap: boolean
  lineNumbers: boolean
  minimap: boolean
  enableRealTimeSync: boolean
}

export interface SyncStatus {
  isConnected: boolean
  lastSync: Date | null
  pendingOperations: number
}

// Action types
export type EditorAction =
  | { type: 'REGISTER_EDITOR'; payload: { tabId: string; filePath: string; fileType: FileType } }
  | { type: 'UNREGISTER_EDITOR'; payload: { tabId: string } }
  | { type: 'UPDATE_CONTENT'; payload: { tabId: string; content: string; version?: number } }
  | { type: 'SET_LOADING'; payload: { tabId: string; isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { tabId: string; error: string | null } }
  | { type: 'SET_DIRTY'; payload: { tabId: string; isDirty: boolean } }
  | { type: 'SET_SAVED'; payload: { tabId: string; version: number } }
  | { type: 'UPDATE_CURSOR_POSITION'; payload: { tabId: string; position: { line: number; column: number } } }
  | { type: 'UPDATE_SCROLL_POSITION'; payload: { tabId: string; position: { top: number; left: number } } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<EditorSettings> }
  | { type: 'UPDATE_SYNC_STATUS'; payload: Partial<SyncStatus> }

// Initial state
const initialState: EditorState = {
  activeEditors: new Map(),
  globalSettings: {
    autoSave: true,
    autoSaveInterval: 2000,
    theme: 'auto',
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    minimap: true,
    enableRealTimeSync: true,
  },
  syncStatus: {
    isConnected: false,
    lastSync: null,
    pendingOperations: 0,
  },
}

// Reducer
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'REGISTER_EDITOR': {
      const { tabId, filePath, fileType } = action.payload
      const newEditor: EditorInstance = {
        tabId,
        filePath,
        fileType,
        content: '',
        isDirty: false,
        isLoading: true,
        error: null,
        version: 0,
        lastSaved: null,
      }
      
      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, newEditor)
      
      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'UNREGISTER_EDITOR': {
      const { tabId } = action.payload
      const newEditors = new Map(state.activeEditors)
      newEditors.delete(tabId)
      
      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'UPDATE_CONTENT': {
      const { tabId, content, version } = action.payload
      const editor = state.activeEditors.get(tabId)
      if (!editor) return state

      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, {
        ...editor,
        content,
        version: version ?? editor.version,
        isDirty: content !== editor.content && editor.lastSaved !== null,
      })

      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'SET_LOADING': {
      const { tabId, isLoading } = action.payload
      const editor = state.activeEditors.get(tabId)
      if (!editor) return state

      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, { ...editor, isLoading })

      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'SET_ERROR': {
      const { tabId, error } = action.payload
      const editor = state.activeEditors.get(tabId)
      if (!editor) return state

      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, { ...editor, error, isLoading: false })

      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'SET_DIRTY': {
      const { tabId, isDirty } = action.payload
      const editor = state.activeEditors.get(tabId)
      if (!editor) return state

      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, { ...editor, isDirty })

      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'SET_SAVED': {
      const { tabId, version } = action.payload
      const editor = state.activeEditors.get(tabId)
      if (!editor) return state

      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, {
        ...editor,
        isDirty: false,
        version,
        lastSaved: new Date(),
        isLoading: false,
        error: null,
      })

      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'UPDATE_CURSOR_POSITION': {
      const { tabId, position } = action.payload
      const editor = state.activeEditors.get(tabId)
      if (!editor) return state

      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, { ...editor, cursorPosition: position })

      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'UPDATE_SCROLL_POSITION': {
      const { tabId, position } = action.payload
      const editor = state.activeEditors.get(tabId)
      if (!editor) return state

      const newEditors = new Map(state.activeEditors)
      newEditors.set(tabId, { ...editor, scrollPosition: position })

      return {
        ...state,
        activeEditors: newEditors,
      }
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        globalSettings: { ...state.globalSettings, ...action.payload },
      }
    }

    case 'UPDATE_SYNC_STATUS': {
      return {
        ...state,
        syncStatus: { ...state.syncStatus, ...action.payload },
      }
    }

    default:
      return state
  }
}

// Context
const EditorContext = createContext<{
  state: EditorState
  dispatch: React.Dispatch<EditorAction>
  // Helper functions
  registerEditor: (tabId: string, filePath: string, fileType: FileType) => void
  unregisterEditor: (tabId: string) => void
  updateContent: (tabId: string, content: string, version?: number) => void
  setLoading: (tabId: string, isLoading: boolean) => void
  setError: (tabId: string, error: string | null) => void
  setDirty: (tabId: string, isDirty: boolean) => void
  setSaved: (tabId: string, version: number) => void
  updateCursorPosition: (tabId: string, position: { line: number; column: number }) => void
  updateScrollPosition: (tabId: string, position: { top: number; left: number }) => void
  updateSettings: (settings: Partial<EditorSettings>) => void
  updateSyncStatus: (status: Partial<SyncStatus>) => void
  setSyncStatus: (status: 'connected' | 'disconnected' | 'error') => void
  getEditor: (tabId: string) => EditorInstance | undefined
  // Save callback management
  registerSaveCallback: (tabId: string, callback: () => Promise<void>) => void
  unregisterSaveCallback: (tabId: string) => void
  saveTab: (tabId: string) => Promise<boolean>
} | null>(null)

// Provider component
export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)
  const [saveCallbacks] = React.useState(new Map<string, () => Promise<void>>())

  // Helper functions
  const registerEditor = useCallback((tabId: string, filePath: string, fileType: FileType) => {
    dispatch({ type: 'REGISTER_EDITOR', payload: { tabId, filePath, fileType } })
  }, [])

  const unregisterEditor = useCallback((tabId: string) => {
    dispatch({ type: 'UNREGISTER_EDITOR', payload: { tabId } })
  }, [])

  const updateContent = useCallback((tabId: string, content: string, version?: number) => {
    dispatch({ type: 'UPDATE_CONTENT', payload: { tabId, content, version } })
  }, [])

  const setLoading = useCallback((tabId: string, isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { tabId, isLoading } })
  }, [])

  const setError = useCallback((tabId: string, error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: { tabId, error } })
  }, [])

  const setDirty = useCallback((tabId: string, isDirty: boolean) => {
    dispatch({ type: 'SET_DIRTY', payload: { tabId, isDirty } })
  }, [])

  const setSaved = useCallback((tabId: string, version: number) => {
    dispatch({ type: 'SET_SAVED', payload: { tabId, version } })
  }, [])

  const updateCursorPosition = useCallback((tabId: string, position: { line: number; column: number }) => {
    dispatch({ type: 'UPDATE_CURSOR_POSITION', payload: { tabId, position } })
  }, [])

  const updateScrollPosition = useCallback((tabId: string, position: { top: number; left: number }) => {
    dispatch({ type: 'UPDATE_SCROLL_POSITION', payload: { tabId, position } })
  }, [])

  const updateSettings = useCallback((settings: Partial<EditorSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings })
  }, [])

  const updateSyncStatus = useCallback((status: Partial<SyncStatus>) => {
    dispatch({ type: 'UPDATE_SYNC_STATUS', payload: status })
  }, [])

  const setSyncStatus = useCallback((status: 'connected' | 'disconnected' | 'error') => {
    dispatch({ 
      type: 'UPDATE_SYNC_STATUS', 
      payload: { 
        isConnected: status === 'connected',
        lastSync: status === 'connected' ? new Date() : null 
      } 
    })
  }, [])

  const getEditor = useCallback((tabId: string) => {
    return state.activeEditors.get(tabId)
  }, [state.activeEditors])

  // Save callback management
  const registerSaveCallback = useCallback((tabId: string, callback: () => Promise<void>) => {
    saveCallbacks.set(tabId, callback)
  }, [saveCallbacks])

  const unregisterSaveCallback = useCallback((tabId: string) => {
    saveCallbacks.delete(tabId)
  }, [saveCallbacks])

  const saveTab = useCallback(async (tabId: string): Promise<boolean> => {
    const saveCallback = saveCallbacks.get(tabId)
    if (saveCallback) {
      try {
        await saveCallback()
        return true
      } catch (error) {
        console.error('Error saving tab:', error)
        return false
      }
    }
    return false
  }, [saveCallbacks])

  const value = {
    state,
    dispatch,
    registerEditor,
    unregisterEditor,
    updateContent,
    setLoading,
    setError,
    setDirty,
    setSaved,
    updateCursorPosition,
    updateScrollPosition,
    updateSettings,
    updateSyncStatus,
    setSyncStatus,
    getEditor,
    registerSaveCallback,
    unregisterSaveCallback,
    saveTab,
  }

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

// Hook to use editor context
export function useEditorContext() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider')
  }
  return context
}
