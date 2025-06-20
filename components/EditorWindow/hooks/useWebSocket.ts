import { useCallback, useRef, useState, useEffect } from 'react'
import { FileWatchMessage } from '../types'

// Constants
const RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000]
const MAX_RECONNECT_ATTEMPTS = 5
const WEBSOCKET_TIMEOUT = 30000

interface UseWebSocketProps {
  path?: string | null
  authToken?: string | null
  hasUnsavedChanges: boolean
  onFileChange: (path: string) => void
}

export const useWebSocket = ({ 
  path, 
  authToken, 
  hasUnsavedChanges, 
  onFileChange 
}: UseWebSocketProps) => {
  const fileWatchSocket = useRef<WebSocket | null>(null)
  const [watchedPath, setWatchedPath] = useState<string>('')
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup function for WebSocket
  const cleanupWebSocket = useCallback(() => {
    if (fileWatchSocket.current) {
      fileWatchSocket.current.close(1000, "Cleanup")
      fileWatchSocket.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    setIsConnected(false)
    setWatchedPath('')
  }, [])

  // Enhanced WebSocket connection with better error handling
  const connectWebSocket = useCallback(() => {
    if (!path || !authToken) {
      console.warn('Cannot connect WebSocket: missing path or auth token')
      return
    }
    
    // Prevent duplicate connections
    if (fileWatchSocket.current?.readyState === WebSocket.OPEN && watchedPath === path) {
      return
    }
    
    // Clean up existing connection
    cleanupWebSocket()
    
    const directory = path.substring(0, path.lastIndexOf('/'))
    const wsUrl = `ws://localhost:8000/api/v1/file-explorer/watch?directory=${encodeURIComponent(directory)}&token=${encodeURIComponent(authToken)}`
    
    console.log(`Connecting to file watch WebSocket: ${wsUrl}`)
    
    try {
      const ws = new WebSocket(wsUrl)
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          console.error('WebSocket connection timeout')
        }
      }, WEBSOCKET_TIMEOUT)
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log(`Connected to file watch WebSocket for ${directory}`)
        setWatchedPath(path)
        setReconnectAttempts(0)
        setIsConnected(true)
        
        // Set up ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25000)
      }
      
      ws.onmessage = (event) => {
        try {
          const data: FileWatchMessage = JSON.parse(event.data)
          
          if (data.type === 'file_changes' && data.changes) {
            const changedFile = data.changes.find((change) => 
              change.path === path && change.type === 'modified'
            )
            
            if (changedFile && !hasUnsavedChanges) {
              console.log(`File ${path} was modified externally, reloading...`)
              onFileChange(path)
            }
          } else if (data.type === 'pong') {
            console.log('Received pong from server')
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error)
        }
      }
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        console.log(`File watch WebSocket connection closed: ${event.code} ${event.reason || ''}`)
        setIsConnected(false)
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const timeout = RECONNECT_INTERVALS[Math.min(reconnectAttempts, RECONNECT_INTERVALS.length - 1)]
          console.log(`Attempting to reconnect file watcher in ${timeout/1000}s (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connectWebSocket()
          }, timeout)
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error(`Failed to connect file watcher after ${MAX_RECONNECT_ATTEMPTS} attempts`)
        }
      }
      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error('File watch WebSocket error:', error)
      }
      
      fileWatchSocket.current = ws
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
    }
  }, [path, authToken, reconnectAttempts, cleanupWebSocket, hasUnsavedChanges, onFileChange])

  // Setup WebSocket connection
  useEffect(() => {
    connectWebSocket()
    return cleanupWebSocket
  }, [connectWebSocket])

  return {
    isConnected,
    cleanupWebSocket
  }
}
