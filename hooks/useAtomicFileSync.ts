import { useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import AtomicFileSyncService, { AtomicFileSubscription } from '@/services/atomicFileSync'

export interface UseAtomicFileSyncOptions {
  filePath: string
  onFileUpdated?: (content: string, checksum: string, timestamp: number) => void
  onNodeUpdated?: (nodeData: any, timestamp: number) => void
  onBackendChange?: (changeType: string, content?: string, checksum?: string) => void
  onError?: (error: string) => void
  enableNodeUpdates?: boolean // Enable atomic node updates for .flow files
}

export function useAtomicFileSync({
  filePath,
  onFileUpdated,
  onNodeUpdated,
  onBackendChange,
  onError,
  enableNodeUpdates = false
}: UseAtomicFileSyncOptions) {
  const { token } = useAuthStore()
  const syncService = AtomicFileSyncService.getInstance()
  const isConnectedRef = useRef(false)
  const currentFilePathRef = useRef<string>('')

  // Stable callback refs to prevent infinite re-subscriptions
  const onFileUpdatedRef = useRef(onFileUpdated)
  const onNodeUpdatedRef = useRef(onNodeUpdated)
  const onBackendChangeRef = useRef(onBackendChange)
  const onErrorRef = useRef(onError)

  // Update callback refs when they change
  useEffect(() => {
    onFileUpdatedRef.current = onFileUpdated
    onNodeUpdatedRef.current = onNodeUpdated
    onBackendChangeRef.current = onBackendChange
    onErrorRef.current = onError
  }, [onFileUpdated, onNodeUpdated, onBackendChange, onError])

  // Connect to sync service and subscribe to file
  useEffect(() => {
    if (!token || !filePath) return

    const connectAndSubscribe = async () => {
      try {
        // Connect to sync service
        const connected = await syncService.connect(token)
        if (connected) {
          isConnectedRef.current = true

          // Unsubscribe from previous file if different
          if (currentFilePathRef.current && currentFilePathRef.current !== filePath) {
            syncService.unsubscribeFromFile(currentFilePathRef.current)
          }

          // Subscribe to new file
          const subscription: AtomicFileSubscription = {
            file_path: filePath,
            onFileUpdated: (content, checksum, timestamp) => {
              if (onFileUpdatedRef.current) {
                onFileUpdatedRef.current(content, checksum, timestamp)
              }
            },
            onNodeUpdated: enableNodeUpdates ? (nodeData, timestamp) => {
              if (onNodeUpdatedRef.current) {
                onNodeUpdatedRef.current(nodeData, timestamp)
              }
            } : undefined,
            onBackendChange: (changeType, content, checksum) => {
              if (onBackendChangeRef.current) {
                onBackendChangeRef.current(changeType, content, checksum)
              }
            },
            onError: (error) => {
              if (onErrorRef.current) {
                onErrorRef.current(error)
              }
            }
          }

          syncService.subscribeToFile(subscription)
          currentFilePathRef.current = filePath

          console.log(`Connected to atomic sync for: ${filePath}`)
        } else {
          console.error('Failed to connect to atomic file sync')
          if (onErrorRef.current) {
            onErrorRef.current('Failed to connect to atomic file sync')
          }
        }
      } catch (error) {
        console.error('Error connecting to atomic file sync:', error)
        if (onErrorRef.current) {
          onErrorRef.current(`Connection error: ${error}`)
        }
      }
    }

    connectAndSubscribe()

    // Cleanup on unmount or file path change
    return () => {
      if (isConnectedRef.current && currentFilePathRef.current) {
        syncService.unsubscribeFromFile(currentFilePathRef.current)
      }
    }
  }, [token, filePath, enableNodeUpdates])

  // Update a single node atomically (for .flow files)
  const updateNode = useCallback((nodeData: any) => {
    if (!isConnectedRef.current || !filePath) {
      console.warn('Cannot update node: not connected to atomic sync service')
      return
    }

    if (!enableNodeUpdates) {
      console.warn('Node updates not enabled for this file')
      return
    }

    syncService.updateFlowNode(filePath, nodeData)
  }, [filePath, enableNodeUpdates])

  // Update entire file content
  const updateFile = useCallback((content: string) => {
    if (!isConnectedRef.current || !filePath) {
      console.warn('Cannot update file: not connected to atomic sync service')
      return
    }

    syncService.updateFileContent(filePath, content)
  }, [filePath])

  // Check if connected
  const isConnected = useCallback(() => {
    return isConnectedRef.current && syncService.isConnectedToSync()
  }, [])

  // Get file checksum
  const getFileChecksum = useCallback(() => {
    return syncService.getFileChecksum(filePath)
  }, [filePath])

  // Check if file has changed externally
  const hasFileChanged = useCallback((newChecksum: string) => {
    return syncService.hasFileChanged(filePath, newChecksum)
  }, [filePath])

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return {
      connected: isConnected(),
      subscribedFiles: syncService.getSubscribedFiles(),
      currentFile: filePath,
      checksum: getFileChecksum()
    }
  }, [isConnected, filePath, getFileChecksum])

  return {
    updateNode,
    updateFile,
    isConnected,
    getSyncStatus,
    getFileChecksum,
    hasFileChanged
  }
}

export default useAtomicFileSync
