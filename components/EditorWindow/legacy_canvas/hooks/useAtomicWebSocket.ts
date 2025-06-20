import { useEffect, useRef, useCallback, useState } from 'react'
import { Node, Edge } from '@xyflow/react'
import { FlowNodeData } from '@/lib/utils/node-utils'
import { AtomicOperation } from '../services/atomicPipelineService'

interface AtomicWebSocketMessage {
  type: 'atomic_update'
  operation: AtomicOperation
  filePath: string
  timestamp: number
  source: 'external' | 'self'
}

interface UseAtomicWebSocketProps {
  filePath: string | null
  authToken: string | null
  onNodeUpdate?: (node: Node<FlowNodeData>) => void
  onEdgeUpdate?: (edge: Edge) => void
  onNodeDelete?: (nodeId: string) => void
  onEdgeDelete?: (edgeId: string) => void
  onMetadataUpdate?: (metadata: any) => void
}

export const useAtomicWebSocket = ({
  filePath,
  authToken,
  onNodeUpdate,
  onEdgeUpdate,
  onNodeDelete,
  onEdgeDelete,
  onMetadataUpdate
}: UseAtomicWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  /**
   * Handle incoming atomic updates from WebSocket
   */
  const handleAtomicUpdate = useCallback((message: AtomicWebSocketMessage) => {
    // Ignore updates from our own operations to prevent loops
    if (message.source === 'self') {
      return
    }

    console.log('Received atomic update:', message)
    
    switch (message.operation.type) {
      case 'node_update':
        const node = message.operation.data as Node<FlowNodeData>
        onNodeUpdate?.(node)
        break
        
      case 'edge_update':
        const edge = message.operation.data as Edge
        onEdgeUpdate?.(edge)
        break
        
      case 'node_delete':
        const nodeId = message.operation.data.nodeId
        onNodeDelete?.(nodeId)
        break
        
      case 'edge_delete':
        const edgeId = message.operation.data.edgeId
        onEdgeDelete?.(edgeId)
        break
        
      case 'metadata_update':
        onMetadataUpdate?.(message.operation.data)
        break
    }
    
    setLastUpdate(message.timestamp)
  }, [onNodeUpdate, onEdgeUpdate, onNodeDelete, onEdgeDelete, onMetadataUpdate])

  /**
   * Connect to WebSocket for atomic updates
   */
  const connect = useCallback(() => {
    if (!filePath || !authToken) {
      return
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/pipeline/atomic?path=${encodeURIComponent(filePath)}&token=${authToken}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('Atomic WebSocket connected for:', filePath)
        setIsConnected(true)
        reconnectAttempts.current = 0
        
        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }
      
      ws.onmessage = (event) => {
        try {
          const message: AtomicWebSocketMessage = JSON.parse(event.data)
          if (message.type === 'atomic_update') {
            handleAtomicUpdate(message)
          }
        } catch (error) {
          console.error('Failed to parse atomic WebSocket message:', error)
        }
      }
      
      ws.onclose = (event) => {
        console.log('Atomic WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect()
        }
      }
      
      ws.onerror = (error) => {
        console.error('Atomic WebSocket error:', error)
        setIsConnected(false)
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create atomic WebSocket connection:', error)
    }
  }, [filePath, authToken, handleAtomicUpdate])

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000) // Max 30 seconds
    reconnectAttempts.current++
    
    console.log(`Scheduling atomic WebSocket reconnection attempt ${reconnectAttempts.current} in ${delay}ms`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  }, [connect])

  /**
   * Send an atomic operation to other clients
   */
  const broadcastOperation = useCallback((operation: AtomicOperation) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    const message: AtomicWebSocketMessage = {
      type: 'atomic_update',
      operation,
      filePath: filePath!,
      timestamp: Date.now(),
      source: 'self'
    }

    try {
      wsRef.current.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to broadcast atomic operation:', error)
    }
  }, [filePath])

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting')
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  // Connect when filePath or authToken changes
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    lastUpdate,
    broadcastOperation,
    reconnect: connect,
    disconnect
  }
}
