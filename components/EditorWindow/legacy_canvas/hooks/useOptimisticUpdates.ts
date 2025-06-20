import { useCallback, useRef, useState } from 'react'
import { Node, Edge } from '@xyflow/react'
import { PipelineService, SaveResponse } from '../services/pipelineService'
import { toast } from 'sonner'

interface OptimisticState {
  pendingNodes: Map<string, Node>
  pendingEdges: Map<string, Edge>
  failedOperations: Map<string, string>
}

interface UseOptimisticUpdatesProps {
  filePath: string | null
  authToken: string | null
  onNodeUpdate?: (node: Node) => void
  onEdgeUpdate?: (edge: Edge) => void
  onNodeDelete?: (nodeId: string) => void
  onEdgeDelete?: (edgeId: string) => void
}

export const useOptimisticUpdates = ({
  filePath,
  authToken,
  onNodeUpdate,
  onEdgeUpdate,
  onNodeDelete,
  onEdgeDelete
}: UseOptimisticUpdatesProps) => {
  const [optimisticState, setOptimisticState] = useState<OptimisticState>({
    pendingNodes: new Map(),
    pendingEdges: new Map(),
    failedOperations: new Map()
  })

  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  /**
   * Optimistically update a node and save it
   */
  const updateNode = useCallback(async (node: Node) => {
    if (!filePath || !authToken) {
      toast.error('Cannot save: No active file or authentication')
      return false
    }

    // Immediately update the UI (optimistic update)
    onNodeUpdate?.(node)
    
    // Mark as pending
    setOptimisticState(prev => ({
      ...prev,
      pendingNodes: new Map(prev.pendingNodes).set(node.id, node)
    }))

    try {
      // Save to backend
      const result = await PipelineService.saveNode(node, filePath, authToken)
      
      if (result.success) {
        // Remove from pending on success
        setOptimisticState(prev => {
          const newPending = new Map(prev.pendingNodes)
          newPending.delete(node.id)
          return { ...prev, pendingNodes: newPending }
        })
        return true
      } else {
        throw new Error(result.error || 'Failed to save node')
      }
    } catch (error) {
      console.error('Failed to save node:', error)
      
      // Mark as failed
      setOptimisticState(prev => ({
        ...prev,
        failedOperations: new Map(prev.failedOperations).set(node.id, error instanceof Error ? error.message : 'Unknown error')
      }))
      
      toast.error(`Failed to save node: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }, [filePath, authToken, onNodeUpdate])

  /**
   * Optimistically update an edge and save it
   */
  const updateEdge = useCallback(async (edge: Edge) => {
    if (!filePath || !authToken) {
      toast.error('Cannot save: No active file or authentication')
      return false
    }

    // Immediately update the UI (optimistic update)
    onEdgeUpdate?.(edge)
    
    // Mark as pending
    setOptimisticState(prev => ({
      ...prev,
      pendingEdges: new Map(prev.pendingEdges).set(edge.id, edge)
    }))

    try {
      // Save to backend
      const result = await PipelineService.saveEdge(edge, filePath, authToken)
      
      if (result.success) {
        // Remove from pending on success
        setOptimisticState(prev => {
          const newPending = new Map(prev.pendingEdges)
          newPending.delete(edge.id)
          return { ...prev, pendingEdges: newPending }
        })
        return true
      } else {
        throw new Error(result.error || 'Failed to save edge')
      }
    } catch (error) {
      console.error('Failed to save edge:', error)
      
      // Mark as failed
      setOptimisticState(prev => ({
        ...prev,
        failedOperations: new Map(prev.failedOperations).set(edge.id, error instanceof Error ? error.message : 'Unknown error')
      }))
      
      toast.error(`Failed to save edge: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }, [filePath, authToken, onEdgeUpdate])

  /**
   * Optimistically delete a node
   */
  const deleteNode = useCallback(async (nodeId: string) => {
    if (!filePath || !authToken) {
      toast.error('Cannot delete: No active file or authentication')
      return false
    }

    // Immediately update the UI (optimistic update)
    onNodeDelete?.(nodeId)

    try {
      // Delete from backend
      const result = await PipelineService.deleteNode(nodeId, filePath, authToken)
      
      if (result.success) {
        return true
      } else {
        throw new Error(result.error || 'Failed to delete node')
      }
    } catch (error) {
      console.error('Failed to delete node:', error)
      toast.error(`Failed to delete node: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }, [filePath, authToken, onNodeDelete])

  /**
   * Optimistically delete an edge
   */
  const deleteEdge = useCallback(async (edgeId: string) => {
    if (!filePath || !authToken) {
      toast.error('Cannot delete: No active file or authentication')
      return false
    }

    // Immediately update the UI (optimistic update)
    onEdgeDelete?.(edgeId)

    try {
      // Delete from backend
      const result = await PipelineService.deleteEdge(edgeId, filePath, authToken)
      
      if (result.success) {
        return true
      } else {
        throw new Error(result.error || 'Failed to delete edge')
      }
    } catch (error) {
      console.error('Failed to delete edge:', error)
      toast.error(`Failed to delete edge: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }, [filePath, authToken, onEdgeDelete])

  /**
   * Retry a failed operation
   */
  const retryOperation = useCallback(async (operationId: string) => {
    const pendingNode = optimisticState.pendingNodes.get(operationId)
    const pendingEdge = optimisticState.pendingEdges.get(operationId)
    
    if (pendingNode) {
      return await updateNode(pendingNode)
    } else if (pendingEdge) {
      return await updateEdge(pendingEdge)
    }
    
    return false
  }, [optimisticState, updateNode, updateEdge])

  /**
   * Clear all pending operations
   */
  const clearPending = useCallback(() => {
    setOptimisticState({
      pendingNodes: new Map(),
      pendingEdges: new Map(),
      failedOperations: new Map()
    })
    
    // Clear retry timeouts
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
    retryTimeouts.current.clear()
  }, [])

  return {
    updateNode,
    updateEdge,
    deleteNode,
    deleteEdge,
    retryOperation,
    clearPending,
    pendingNodes: Array.from(optimisticState.pendingNodes.values()),
    pendingEdges: Array.from(optimisticState.pendingEdges.values()),
    failedOperations: Array.from(optimisticState.failedOperations.entries()),
    hasPendingOperations: optimisticState.pendingNodes.size > 0 || optimisticState.pendingEdges.size > 0
  }
}
