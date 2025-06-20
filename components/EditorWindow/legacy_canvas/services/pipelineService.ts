import { Node, Edge } from '@xyflow/react'

export interface PipelineData {
  id?: string
  name?: string
  description?: string
  version?: string
  author?: string
  created?: string
  modified?: string
  config?: Record<string, any>
  global_variables?: Record<string, any>
  shared_imports?: string[]
  execution_history?: any[]
  nodes: Node[]
  edges: Edge[]
  metadata?: {
    id: string
    name: string
    description: string
    version?: string
    author?: string
  }
}

export interface SaveResponse {
  success: boolean
  error?: string
}

export class PipelineService {
  private static cachedPipelines = new Map<string, PipelineData>()

  /**
   * Load pipeline data from backend
   */
  static async loadPipeline(filePath: string, authToken: string): Promise<PipelineData | null> {
    // Check cache first
    if (this.cachedPipelines.has(filePath)) {
      return this.cachedPipelines.get(filePath)!
    }

    try {
      const rootPath = filePath.substring(0, filePath.lastIndexOf('/'))
      
      const response = await fetch(`http://localhost:8000/api/v1/file-explorer/file-content?path=${encodeURIComponent(filePath)}&root_path=${encodeURIComponent(rootPath || '/')}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch pipeline: ${response.statusText}`)
      }

      const content = await response.text()
      if (!content.trim()) {
        return null
      }

      const rawPipeline = JSON.parse(content)
      
      // Convert to our PipelineData format
      const pipeline: PipelineData = {
        id: rawPipeline.id || 'flow_001',
        name: rawPipeline.name || 'Pipeline',
        description: rawPipeline.description || '',
        version: rawPipeline.version,
        author: rawPipeline.author,
        created: rawPipeline.created,
        modified: rawPipeline.modified,
        config: rawPipeline.config || {},
        global_variables: rawPipeline.global_variables || {},
        shared_imports: rawPipeline.shared_imports || [],
        execution_history: rawPipeline.execution_history || [],
        nodes: rawPipeline.nodes || [],
        edges: rawPipeline.edges || [],
        metadata: {
          id: rawPipeline.id || 'flow_001',
          name: rawPipeline.name || 'Pipeline',
          description: rawPipeline.description || '',
          version: rawPipeline.version,
          author: rawPipeline.author
        }
      }
      
      // Cache the pipeline
      this.cachedPipelines.set(filePath, pipeline)
      
      return pipeline
    } catch (error) {
      console.error('Failed to load pipeline:', error)
      return null
    }
  }

  /**
   * Save pipeline data to backend
   */
  static async savePipeline(
    nodes: Node[],
    edges: Edge[],
    metadata: { id: string; name: string; description: string },
    filePath: string,
    authToken: string
  ): Promise<SaveResponse> {
    try {
      const pipelineData: PipelineData = {
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        modified: new Date().toISOString(),
        config: {},
        global_variables: {},
        shared_imports: [],
        execution_history: [],
        nodes,
        edges,
        metadata
      }

      const response = await fetch(`http://localhost:8000/api/v1/pipeline/update-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          file_path: filePath,
          pipeline_data: pipelineData
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save pipeline: ${response.statusText}`)
      }

      // Update cache
      this.cachedPipelines.set(filePath, pipelineData)

      return { success: true }
    } catch (error) {
      console.error('Failed to save pipeline:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Save a single node
   */
  static async saveNode(node: Node, filePath: string, authToken: string): Promise<SaveResponse> {
    try {
      const currentPipeline = await this.loadPipeline(filePath, authToken)
      if (!currentPipeline) {
        throw new Error('Pipeline not found')
      }

      // Update or add the node
      const nodes = currentPipeline.nodes || []
      const nodeIndex = nodes.findIndex(n => n.id === node.id)
      
      if (nodeIndex >= 0) {
        nodes[nodeIndex] = node
      } else {
        nodes.push(node)
      }

      return this.savePipeline(
        nodes,
        currentPipeline.edges || [],
        currentPipeline.metadata || { id: 'flow_001', name: 'Pipeline', description: '' },
        filePath,
        authToken
      )
    } catch (error) {
      console.error('Failed to save node:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Save a single edge
   */
  static async saveEdge(edge: Edge, filePath: string, authToken: string): Promise<SaveResponse> {
    try {
      const currentPipeline = await this.loadPipeline(filePath, authToken)
      if (!currentPipeline) {
        throw new Error('Pipeline not found')
      }

      // Update or add the edge
      const edges = currentPipeline.edges || []
      const edgeIndex = edges.findIndex(e => e.id === edge.id)
      
      if (edgeIndex >= 0) {
        edges[edgeIndex] = edge
      } else {
        edges.push(edge)
      }

      return this.savePipeline(
        currentPipeline.nodes || [],
        edges,
        currentPipeline.metadata || { id: 'flow_001', name: 'Pipeline', description: '' },
        filePath,
        authToken
      )
    } catch (error) {
      console.error('Failed to save edge:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete a node
   */
  static async deleteNode(nodeId: string, filePath: string, authToken: string): Promise<SaveResponse> {
    try {
      const currentPipeline = await this.loadPipeline(filePath, authToken)
      if (!currentPipeline) {
        throw new Error('Pipeline not found')
      }

      // Remove the node and connected edges
      const nodes = (currentPipeline.nodes || []).filter(n => n.id !== nodeId)
      const edges = (currentPipeline.edges || []).filter(e => e.source !== nodeId && e.target !== nodeId)

      return this.savePipeline(
        nodes,
        edges,
        currentPipeline.metadata || { id: 'flow_001', name: 'Pipeline', description: '' },
        filePath,
        authToken
      )
    } catch (error) {
      console.error('Failed to delete node:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Delete an edge
   */
  static async deleteEdge(edgeId: string, filePath: string, authToken: string): Promise<SaveResponse> {
    try {
      const currentPipeline = await this.loadPipeline(filePath, authToken)
      if (!currentPipeline) {
        throw new Error('Pipeline not found')
      }

      // Remove the edge
      const edges = (currentPipeline.edges || []).filter(e => e.id !== edgeId)

      return this.savePipeline(
        currentPipeline.nodes || [],
        edges,
        currentPipeline.metadata || { id: 'flow_001', name: 'Pipeline', description: '' },
        filePath,
        authToken
      )
    } catch (error) {
      console.error('Failed to delete edge:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clear cache for a specific file
   */
  static invalidateCache(filePath: string): void {
    this.cachedPipelines.delete(filePath)
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    this.cachedPipelines.clear()
  }

  /**
   * Save pipeline to backend (alias for savePipeline with additional parameters)
   */
  static async savePipelineToBackend(
    nodes: Node[],
    edges: Edge[],
    metadata: { id: string; name: string; description: string } | null,
    filePath: string,
    authToken: string,
    existingPipelineData?: any
  ): Promise<PipelineData> {
    const pipelineMetadata = metadata || { id: 'flow_001', name: 'Pipeline', description: '' }
    
    const result = await this.savePipeline(nodes, edges, pipelineMetadata, filePath, authToken)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save pipeline')
    }

    // Return the updated pipeline data
    const updatedPipeline: PipelineData = {
      id: pipelineMetadata.id,
      name: pipelineMetadata.name,
      description: pipelineMetadata.description,
      modified: new Date().toISOString(),
      config: existingPipelineData?.config || {},
      global_variables: existingPipelineData?.global_variables || {},
      shared_imports: existingPipelineData?.shared_imports || [],
      execution_history: existingPipelineData?.execution_history || [],
      nodes,
      edges,
      metadata: pipelineMetadata
    }

    return updatedPipeline
  }

  /**
   * Update metadata on backend
   */
  static async updateMetadataOnBackend(
    metadata: { id: string; name: string; description: string; version?: string; author?: string },
    filePath: string,
    authToken: string,
    preserveData: boolean = true
  ): Promise<PipelineData | null> {
    try {
      const currentPipeline = await this.loadPipeline(filePath, authToken)
      
      if (!currentPipeline && !preserveData) {
        throw new Error('Pipeline not found')
      }

      const updatedPipeline: PipelineData = {
        ...currentPipeline,
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        version: metadata.version,
        author: metadata.author,
        modified: new Date().toISOString(),
        nodes: currentPipeline?.nodes || [],
        edges: currentPipeline?.edges || [],
        metadata: {
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          version: metadata.version,
          author: metadata.author
        }
      }

      const result = await this.savePipeline(
        updatedPipeline.nodes,
        updatedPipeline.edges,
        updatedPipeline.metadata,
        filePath,
        authToken
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to update metadata')
      }

      return updatedPipeline
    } catch (error) {
      console.error('Failed to update metadata:', error)
      throw error
    }
  }

  /**
   * Create pipeline data structure from current state
   */
  static createPipelineFromState(
    nodes: Node[],
    edges: Edge[],
    metadata: { id: string; name: string; description: string; version?: string; author?: string } | null,
    existingPipelineData?: any
  ): PipelineData {
    const pipelineMetadata = metadata || { id: 'flow_001', name: 'Pipeline', description: '' }
    
    return {
      id: pipelineMetadata.id,
      name: pipelineMetadata.name,
      description: pipelineMetadata.description,
      version: pipelineMetadata.version,
      author: pipelineMetadata.author,
      modified: new Date().toISOString(),
      config: existingPipelineData?.config || {},
      global_variables: existingPipelineData?.global_variables || {},
      shared_imports: existingPipelineData?.shared_imports || [],
      execution_history: existingPipelineData?.execution_history || [],
      nodes: nodes || [],
      edges: edges || [],
      metadata: pipelineMetadata
    }
  }

  /**
   * Download pipeline as JSON file
   */
  static downloadPipeline(pipelineData: PipelineData, filename: string = 'pipeline.flow'): void {
    try {
      const jsonString = JSON.stringify(pipelineData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL object
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download pipeline:', error)
      throw new Error('Failed to download pipeline')
    }
  }
}