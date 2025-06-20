import { useCallback } from 'react'
import { Node, Edge } from '@xyflow/react'
import { toast } from 'sonner'
import { FlowNodeData } from '@/lib/utils/node-utils'
import { PipelineService } from '../services/pipelineService'
import { PipelineMetadata, DataProcessingPipeline, UsePipelineOperationsProps } from '../types'

export const usePipelineOperations = ({
  nodes,
  edges,
  metadata,
  activePath,
  authToken,
  pipelineData,
  onPipelineUpdate
}: UsePipelineOperationsProps) => {

  const savePipeline = useCallback(async () => {
    // Make a local copy of edges to ensure we're working with the current state
    const currentEdges = edges || []
    
    // Log detailed information about the save operation
    console.log('savePipeline called with:', { 
      activePath, 
      authToken: !!authToken,
      hasNodes: nodes?.length > 0,
      hasEdges: currentEdges.length > 0,
      edgesCount: currentEdges.length,
      hasMetadata: !!metadata
    })
    
    // Log edges for debugging
    if (currentEdges.length > 0) {
      console.log('Edges being saved:', JSON.stringify(currentEdges))
    } else {
      console.warn('No edges to save - this might be unexpected if you just connected nodes')
    }
    
    if (!activePath) {
      console.error('Cannot save pipeline: No active file path available')
      toast.error('No active file selected')
      return false
    }
    
    if (!authToken) {
      console.error('Cannot save pipeline: No authentication token available')
      toast.error('No authentication token available')
      return false
    }

    try {
      toast.loading('Saving pipeline...', { id: 'save-pipeline' })
      
      const updatedPipeline = await PipelineService.savePipelineToBackend(
        nodes,
        edges,
        metadata,
        activePath,
        authToken,
        pipelineData || undefined
      )
      
      // Notify about the updated pipeline
      if (onPipelineUpdate) {
        const dataProcessingPipeline: DataProcessingPipeline = {
          id: updatedPipeline.id || 'flow_001',
          name: updatedPipeline.name || 'Pipeline',
          description: updatedPipeline.description || '',
          version: updatedPipeline.version || '1.0.0',
          created: updatedPipeline.created || new Date().toISOString(),
          modified: updatedPipeline.modified || new Date().toISOString(),
          author: updatedPipeline.author || 'Unknown',
          config: {
            auto_layout: false,
            execution_mode: 'sequential',
            default_language: 'python',
            environment: 'default',
            global_timeout: 300
          },
          nodes: updatedPipeline.nodes.map(node => ({
            id: node.id,
            type: node.type || 'default',
            position: {
              x: node.position.x,
              y: node.position.y
            },
            data: {
              ...node.data,
              title: node.data.title || node.id,
              description: node.data.description || '',
              language: node.data.language || 'python',
              source: node.data.source || [],
              status: node.data.status || 'idle',
              execution_count: node.data.execution_count || 0,
              execution_timing: node.data.execution_timing || {
                start_time: '',
                end_time: '',
                duration: 0,
                queued_time: ''
              },
              inputs: node.data.inputs || [],
              outputs: node.data.outputs || [],
              logs: node.data.logs || [],
              errors: node.data.errors || [],
              warnings: node.data.warnings || [],
              stdout: node.data.stdout || [],
              stderr: node.data.stderr || [],
              metadata: node.data.metadata || {
                tags: [],
                author: '',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                notes: '',
                collapsed: false,
                pinned: false,
                version: 1,
                dependencies: null,
                environment: 'default'
              },
              ui: node.data.ui || {
                color: '#ffffff',
                icon: 'default',
                width: 200,
                height: 100,
                theme: 'default',
                font_size: 12,
                show_line_numbers: true
              },
              dependencies: node.data.dependencies || [],
              config: node.data.config || {
                timeout: 60,
                memory_limit: 1024,
                cpu_limit: 1,
                auto_run: false,
                cache_results: false
              }
            },
            draggable: node.draggable,
            selectable: node.selectable,
            deletable: node.deletable ?? true,
            hidden: node.hidden ?? false,
            selected: node.selected ?? false,
            width: node.width,
            height: node.height
          })),
          edges: updatedPipeline.edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            sourceHandle: edge.sourceHandle || '',
            target: edge.target,
            targetHandle: edge.targetHandle || '',
            type: edge.type,
            data: edge.data,
            label: edge.label
          })),
          global_variables: updatedPipeline.global_variables || {},
          shared_imports: updatedPipeline.shared_imports || [],
          execution_history: updatedPipeline.execution_history || []
        }
        
        onPipelineUpdate(dataProcessingPipeline)
      }
      
      toast.success('Pipeline saved successfully', { id: 'save-pipeline' })
      return true
    } catch (error) {
      console.error('Error saving pipeline:', error)
      toast.error(`Failed to save pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'save-pipeline' })
      return false
    }
  }, [nodes, edges, metadata, activePath, authToken, pipelineData, onPipelineUpdate])

  const updateMetadata = useCallback(async (newMetadata: PipelineMetadata) => {
    console.log('updateMetadata called with:', { activePath, authToken: !!authToken, newMetadata })
    
    if (!activePath) {
      toast.error('No active file selected')
      return false
    }
    
    if (!authToken) {
      toast.error('No authentication token available')
      return false
    }

    try {
      toast.loading('Updating metadata...', { id: 'update-metadata' })
      
      const updatedPipeline = await PipelineService.updateMetadataOnBackend(
        newMetadata,
        activePath,
        authToken,
        true // Preserve all data
      )
      
      // Notify about the updated pipeline
      if (onPipelineUpdate && updatedPipeline) {
        const dataProcessingPipeline: DataProcessingPipeline = {
          id: updatedPipeline.id || 'flow_001',
          name: updatedPipeline.name || 'Pipeline',
          description: updatedPipeline.description || '',
          version: updatedPipeline.version || '1.0.0',
          created: updatedPipeline.created || new Date().toISOString(),
          modified: updatedPipeline.modified || new Date().toISOString(),
          author: updatedPipeline.author || 'Unknown',
          config: {
            auto_layout: false,
            execution_mode: 'sequential',
            default_language: 'python',
            environment: 'default',
            global_timeout: 300
          },
          nodes: updatedPipeline.nodes.map(node => ({
            id: node.id,
            type: node.type || 'default',
            position: {
              x: node.position.x,
              y: node.position.y
            },
            data: {
              ...node.data,
              title: node.data.title || node.id,
              description: node.data.description || '',
              language: node.data.language || 'python',
              source: node.data.source || [],
              status: node.data.status || 'idle',
              execution_count: node.data.execution_count || 0,
              execution_timing: node.data.execution_timing || {
                start_time: '',
                end_time: '',
                duration: 0,
                queued_time: ''
              },
              inputs: node.data.inputs || [],
              outputs: node.data.outputs || [],
              logs: node.data.logs || [],
              errors: node.data.errors || [],
              warnings: node.data.warnings || [],
              stdout: node.data.stdout || [],
              stderr: node.data.stderr || [],
              metadata: node.data.metadata || {
                tags: [],
                author: '',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                notes: '',
                collapsed: false,
                pinned: false,
                version: 1,
                dependencies: null,
                environment: 'default'
              },
              ui: node.data.ui || {
                color: '#ffffff',
                icon: 'default',
                width: 200,
                height: 100,
                theme: 'default',
                font_size: 12,
                show_line_numbers: true
              },
              dependencies: node.data.dependencies || [],
              config: node.data.config || {
                timeout: 60,
                memory_limit: 1024,
                cpu_limit: 1,
                auto_run: false,
                cache_results: false
              }
            },
            draggable: node.draggable,
            selectable: node.selectable,
            deletable: node.deletable ?? true,
            hidden: node.hidden ?? false,
            selected: node.selected ?? false,
            width: node.width,
            height: node.height
          })),
          edges: updatedPipeline.edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            sourceHandle: edge.sourceHandle || '',
            target: edge.target,
            targetHandle: edge.targetHandle || '',
            type: edge.type,
            data: edge.data,
            label: edge.label
          })),
          global_variables: updatedPipeline.global_variables || {},
          shared_imports: updatedPipeline.shared_imports || [],
          execution_history: updatedPipeline.execution_history || []
        }
        
        onPipelineUpdate(dataProcessingPipeline)
      }
      
      toast.success('Metadata updated successfully', { id: 'update-metadata' })
      return true
    } catch (error) {
      console.error('Error updating metadata:', error)
      toast.error(`Failed to update metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'update-metadata' })
      return false
    }
  }, [activePath, authToken, onPipelineUpdate])

  const downloadPipeline = useCallback(async () => {
    try {
      const pipeline = PipelineService.createPipelineFromState(
        nodes,
        edges,
        metadata,
        pipelineData || undefined
      )
      
      // Extract filename from active path, or use a default name
      let filename = 'pipeline.flow'
      if (activePath) {
        const pathParts = activePath.split('/')
        const fileWithExt = pathParts[pathParts.length - 1]
        if (fileWithExt && fileWithExt.includes('.')) {
          filename = fileWithExt
        } else if (fileWithExt) {
          filename = `${fileWithExt}.flow`
        }
      }
      
      PipelineService.downloadPipeline(pipeline, filename)
      toast.success('Pipeline downloaded successfully')
    } catch (error) {
      console.error('Error downloading pipeline:', error)
      toast.error(`Failed to download pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [nodes, edges, metadata, activePath, pipelineData])

  return {
    savePipeline,
    updateMetadata,
    downloadPipeline
  }
}
