import { useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import RealtimeFileSyncService, { FileSyncMessage } from '@/services/realtimeFileSync'

export interface UseRealtimeFileSyncOptions {
  filePath: string
  onFileUpdated?: (content: string, timestamp: number) => void
  onFileChanged?: (changeType: string, content?: string, oldPath?: string) => void
  onError?: (error: string) => void
  autoSave?: boolean
  saveDebounceMs?: number
}

export function useRealtimeFileSync({
  filePath,
  onFileUpdated,
  onFileChanged,
  onError,
  autoSave = false,
  saveDebounceMs = 1000
}: UseRealtimeFileSyncOptions) {
  const { token } = useAuthStore()
  const syncService = RealtimeFileSyncService.getInstance()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContentRef = useRef<string>('')
  const isConnectedRef = useRef(false)

  // Handle incoming sync messages - use refs to avoid dependency issues
  const onFileUpdatedRef = useRef(onFileUpdated)
  const onFileChangedRef = useRef(onFileChanged)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onFileUpdatedRef.current = onFileUpdated
    onFileChangedRef.current = onFileChanged
    onErrorRef.current = onError
  }, [onFileUpdated, onFileChanged, onError])

  // Handle incoming sync messages
  const handleSyncMessage = useCallback((message: FileSyncMessage) => {
    switch (message.type) {
      case 'file_content':
        // Initial file content received
        if (message.content !== undefined && onFileUpdatedRef.current) {
          lastSavedContentRef.current = message.content
          onFileUpdatedRef.current(message.content, message.timestamp || Date.now())
        }
        break

      case 'file_updated':
        // File updated by another client
        if (message.content !== undefined && onFileUpdatedRef.current) {
          lastSavedContentRef.current = message.content
          onFileUpdatedRef.current(message.content, message.timestamp || Date.now())
        }
        break

      case 'file_changed':
        // File changed on filesystem
        if (onFileChangedRef.current) {
          onFileChangedRef.current(
            message.change_type || 'modified',
            message.content,
            message.old_path
          )
        }
        break

      case 'file_saved':
        // File save confirmation
        console.log(`File saved: ${message.file_path} at ${message.timestamp}`)
        break

      case 'error':
        if (onErrorRef.current) {
          onErrorRef.current(message.message || 'Unknown error')
        }
        break
    }
  }, []) // Empty dependencies - stable callback

  // Connect to sync service and subscribe to file
  useEffect(() => {
    if (!token || !filePath) return

    const connectAndSubscribe = async () => {
      try {
        // Connect to sync service
        const connected = await syncService.connect(token)
        if (connected) {
          isConnectedRef.current = true
          // Subscribe to file updates
          syncService.subscribeToFile(filePath, handleSyncMessage)
        } else {
          console.error('Failed to connect to real-time file sync')
          if (onError) {
            onError('Failed to connect to real-time file sync')
          }
        }
      } catch (error) {
        console.error('Error connecting to file sync:', error)
        if (onError) {
          onError(`Connection error: ${error}`)
        }
      }
    }

    connectAndSubscribe()

    // Cleanup on unmount or file path change
    return () => {
      if (isConnectedRef.current) {
        syncService.unsubscribeFromFile(filePath, handleSyncMessage)
      }
      
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [token, filePath, onError]) // Remove handleSyncMessage from dependencies to prevent infinite loop

  // Save file content with debouncing
  const saveFile = useCallback((content: string, immediate = false) => {
    if (!isConnectedRef.current || !filePath) {
      console.warn('Cannot save: not connected to sync service')
      return
    }

    // Skip if content hasn't changed
    if (content === lastSavedContentRef.current) {
      return
    }

    const doSave = () => {
      syncService.updateFile(filePath, content)
      lastSavedContentRef.current = content
    }

    if (immediate) {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      doSave()
    } else {
      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(doSave, saveDebounceMs)
    }
  }, [filePath, saveDebounceMs])

  // Auto-save functionality
  const enableAutoSave = useCallback((content: string) => {
    if (autoSave && content !== lastSavedContentRef.current) {
      saveFile(content)
    }
  }, [autoSave, saveFile])

  // Force immediate save
  const forceSave = useCallback((content: string) => {
    saveFile(content, true)
  }, [saveFile])

  // Check if connected
  const isConnected = useCallback(() => {
    return isConnectedRef.current && syncService.isConnectedToSync()
  }, [])

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return {
      connected: isConnected(),
      subscribedFiles: syncService.getSubscribedFiles(),
      hasUnsavedChanges: saveTimeoutRef.current !== null
    }
  }, [isConnected])

  return {
    saveFile,
    forceSave,
    enableAutoSave,
    isConnected,
    getSyncStatus
  }
}

export default useRealtimeFileSync
