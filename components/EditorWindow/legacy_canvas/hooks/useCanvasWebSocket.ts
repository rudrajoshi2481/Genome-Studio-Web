import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { UseCanvasWebSocketProps, CanvasWebSocketMessage } from '../types'

export const useCanvasWebSocket = ({
  activePath,
  authToken,
  onMetadataUpdate,
  onPipelineUpdate,
  onNodesUpdate,
  onEdgesUpdate
}: UseCanvasWebSocketProps) => {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 5
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Send message to WebSocket
  const sendMessage = useCallback((message: CanvasWebSocketMessage) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify(message))
      return true
    }
    return false
  }, [wsConnection])

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!activePath || !authToken) {
      console.warn('Cannot connect WebSocket: Missing activePath or authToken', { activePath, hasToken: !!authToken })
      return
    }

    // Close existing connection if any
    if (wsConnection) {
      try {
        wsConnection.close(1000, 'Reconnecting')
      } catch (err) {
        console.error('Error closing existing WebSocket connection:', err)
      }
    }

    // Clear existing ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }

    // Encode the file path for the URL
    const encodedPath = encodeURIComponent(activePath)
    // Include token in WebSocket URL
    const wsUrl = `ws://localhost:8000/api/v1/pipeline/ws/${encodedPath}?token=${encodeURIComponent(authToken)}`

    console.log(`Connecting to WebSocket: ${wsUrl}`)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connection established')
      setIsConnected(true)
      setReconnectAttempts(0) // Reset reconnect attempts on successful connection
      toast.success('Connected to pipeline updates')

      // Send a ping to keep the connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000) // 30 seconds
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as CanvasWebSocketMessage
        console.log('WebSocket message received:', message)

        // Validate message before processing
        if (!message || typeof message !== 'object' || !message.type) {
          console.warn('Received invalid WebSocket message format:', message)
          return
        }

        switch (message.type) {
          case 'metadata_update':
            if (message.metadata && onMetadataUpdate) {
              onMetadataUpdate(message.metadata)
              toast.info('Pipeline metadata updated from server')
            }
            break

          case 'pipeline_update':
            if (message.pipeline && onPipelineUpdate) {
              onPipelineUpdate(message.pipeline)
              toast.info('Pipeline updated from server')
            }
            break

          case 'nodes_update':
            if (message.nodes && onNodesUpdate) {
              onNodesUpdate(message.nodes)
            }
            break

          case 'edges_update':
            if (message.edges && onEdgesUpdate) {
              onEdgesUpdate(message.edges)
            }
            break

          case 'file_update':
            // Handle full file updates - reload the entire pipeline
            if (message.metadata && onMetadataUpdate) {
              onMetadataUpdate(message.metadata)
            }
            if (message.nodes && onNodesUpdate) {
              onNodesUpdate(message.nodes)
            }
            if (message.edges && onEdgesUpdate) {
              onEdgesUpdate(message.edges)
            }
            toast.info('Pipeline file updated from server')
            break

          case 'pong':
            console.log('Received pong from server')
            break

          default:
            console.log('Unknown message type:', message.type)
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error)
      }
    }

    ws.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`)
      setIsConnected(false)
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }

      // Attempt to reconnect if not closed intentionally
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Exponential backoff up to 30s
        console.log(`Attempting to reconnect in ${timeout/1000}s (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`)

        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1)
          connectWebSocket()
        }, timeout)
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        toast.error(`Failed to connect after ${maxReconnectAttempts} attempts. Please refresh the page.`)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      // Don't show toast here as onclose will be called next and handle reconnection
    }

    setWsConnection(ws)
  }, [activePath, authToken, reconnectAttempts, onMetadataUpdate, onPipelineUpdate, onNodesUpdate, onEdgesUpdate])

  // Connect to WebSocket when dependencies change
  useEffect(() => {
    connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (wsConnection) {
        wsConnection.close(1000, "Component unmounting")
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [connectWebSocket])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [])

  return {
    isConnected,
    sendMessage,
    reconnect: connectWebSocket
  }
}
