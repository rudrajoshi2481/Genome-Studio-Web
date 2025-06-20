import { Node, Edge } from '@xyflow/react'
import { FlowNodeData } from '@/lib/utils/node-utils'

// Import the complete pipeline types
import { DataProcessingPipeline, PipelineNode, PipelineEdge } from '@/lib/types/pipeline-flow'

export interface CanvasProps {
  fileContent?: string
  activePath?: string
}

// Use the complete pipeline metadata from the schema
export interface PipelineMetadata {
  id: string
  name: string
  description: string
  version?: string
  created?: string
  modified?: string
  author?: string
}

// WebSocket message types for pipeline updates
export interface CanvasWebSocketMessage {
  type: 'metadata_update' | 'file_update' | 'pipeline_update' | 'nodes_update' | 'edges_update' | 'ping' | 'pong'
  metadata?: PipelineMetadata
  pipeline?: Partial<DataProcessingPipeline>
  nodes?: Node<FlowNodeData>[]
  edges?: Edge[]
}

// Hook props interfaces
export interface UseCanvasWebSocketProps {
  activePath?: string | null
  authToken?: string | null
  onMetadataUpdate: (metadata: PipelineMetadata) => void
  onPipelineUpdate?: (pipeline: Partial<DataProcessingPipeline>) => void
  onNodesUpdate?: (nodes: Node<FlowNodeData>[]) => void
  onEdgesUpdate?: (edges: Edge[]) => void
}

export interface UsePipelineProps {
  fileContent?: string
  onNodesChange: (nodes: Node<FlowNodeData>[]) => void
  onEdgesChange: (edges: Edge[]) => void
  onMetadataChange: (metadata: PipelineMetadata) => void
  onPipelineDataChange?: (pipeline: DataProcessingPipeline) => void
  onNodeDelete?: (nodeId: string) => void
}

export interface UsePipelineOperationsProps {
  nodes: Node<FlowNodeData>[]
  edges: Edge[]
  metadata: PipelineMetadata
  activePath?: string | null
  authToken?: string | null
  pipelineData?: DataProcessingPipeline
  onPipelineUpdate?: (pipeline: DataProcessingPipeline) => void
}

// Re-export the complete pipeline types for convenience
export type { DataProcessingPipeline, PipelineNode, PipelineEdge }
