import { useState, useEffect, useCallback, useMemo } from 'react'
import { Node, Edge } from '@xyflow/react'
import { toast } from 'sonner'
import { FlowNodeData } from '@/lib/utils/node-utils'
import { UsePipelineProps, PipelineMetadata, DataProcessingPipeline, PipelineNode } from '../types'

export const usePipeline = ({
  fileContent,
  onNodesChange,
  onEdgesChange,
  onMetadataChange,
  onPipelineDataChange,
  onNodeDelete
}: UsePipelineProps) => {
  const [pipelineLoaded, setPipelineLoaded] = useState(false)
  const [pipelineData, setPipelineData] = useState<DataProcessingPipeline | null>(null)
  const [lastFileContent, setLastFileContent] = useState<string | null>(null)

  // Convert pipeline node to React Flow node
  const convertPipelineNodeToFlowNode = useCallback((pipelineNode: PipelineNode): Node<FlowNodeData> => {
    return {
      id: pipelineNode.id,
      type: pipelineNode.type || 'dynamicCustomNode',
      position: pipelineNode.position,
      data: {
        title: pipelineNode.data?.title || 'Untitled Node',
        description: pipelineNode.data?.description || '',
        inputs: pipelineNode.data?.inputs || [],
        outputs: pipelineNode.data?.outputs || [],
        language: pipelineNode.data?.language || 'python',
        function_name: pipelineNode.data?.title?.replace(/\s+/g, '_').toLowerCase() || 'untitled_function',
        source_code: Array.isArray(pipelineNode.data?.source) ? pipelineNode.data.source.join('\n') : (pipelineNode.data?.source || ''),
        node_id: pipelineNode.id,
        is_public: pipelineNode.data?.metadata?.pinned || false,
        tags: pipelineNode.data?.metadata?.tags || [],
        instance_id: `${pipelineNode.id}_${Date.now()}`,
        onNodeDelete: onNodeDelete,
        status: pipelineNode.data?.status || 'idle',
        execution_count: pipelineNode.data?.execution_count || 0,
        execution_timing: pipelineNode.data?.execution_timing || {
          start_time: '',
          end_time: '',
          duration: 0,
          queued_time: ''
        },
        logs: pipelineNode.data?.logs || [],
        errors: pipelineNode.data?.errors || [],
        warnings: pipelineNode.data?.warnings || [],
        stdout: pipelineNode.data?.stdout || [],
        stderr: pipelineNode.data?.stderr || [],
        metadata: pipelineNode.data?.metadata || {
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
        ui: pipelineNode.data?.ui || {
          color: '#3b82f6',
          icon: 'code',
          width: 200,
          height: 150,
          theme: 'default',
          font_size: 12,
          show_line_numbers: true
        },
        dependencies: pipelineNode.data?.dependencies || [],
        config: pipelineNode.data?.config || {
          timeout: 30,
          memory_limit: 512,
          cpu_limit: 1,
          auto_run: false,
          cache_results: true
        }
      },
      draggable: pipelineNode.draggable !== false,
      selectable: pipelineNode.selectable !== false,
      deletable: pipelineNode.deletable !== false,
      hidden: pipelineNode.hidden || false,
      selected: pipelineNode.selected || false,
      width: pipelineNode.width,
      height: pipelineNode.height
    }
  }, [onNodeDelete])

  // Memoized pipeline loading to prevent unnecessary re-renders
  const loadPipeline = useCallback(() => {
    // Skip if file content hasn't changed
    if (fileContent === lastFileContent) {
      console.log('File content unchanged, skipping pipeline reload');
      return;
    }

    try {
      if (!fileContent) {
        console.log('No file content provided')
        onNodesChange([])
        onEdgesChange([])
        onMetadataChange({
          id: "flow_001",
          name: "Data Processing Pipeline",
          description: "A flow for data processing and visualization"
        })
        setPipelineLoaded(true)
        setLastFileContent(fileContent || null)
        return
      }

      if (fileContent.trim() === '') {
        console.log('Empty file content, using default empty pipeline')
        onNodesChange([])
        onEdgesChange([])
        onMetadataChange({
          id: "flow_001",
          name: "Data Processing Pipeline",
          description: "A flow for data processing and visualization"
        })
        setPipelineLoaded(true)
        setLastFileContent(fileContent || null)
        return
      }

      let pipeline: DataProcessingPipeline
      try {
        pipeline = JSON.parse(fileContent)
      } catch (parseError) {
        console.error('Error parsing pipeline JSON:', parseError)
        toast.error('Invalid JSON format in pipeline file')
        return
      }

      if (!pipeline || typeof pipeline !== 'object') {
        console.error('Invalid pipeline format - not an object')
        toast.error('Invalid pipeline format')
        return
      }

      console.log('Loaded pipeline:', pipeline)
      setPipelineData(pipeline)

      const metadata: PipelineMetadata = {
        id: pipeline.id || "flow_001",
        name: pipeline.name || "Data Processing Pipeline",
        description: pipeline.description || "A flow for data processing and visualization",
        version: pipeline.version,
        created: pipeline.created,
        modified: pipeline.modified,
        author: pipeline.author
      }
      onMetadataChange(metadata)

      if (pipeline.nodes && Array.isArray(pipeline.nodes)) {
        const flowNodes = pipeline.nodes.map(convertPipelineNodeToFlowNode)
        onNodesChange(flowNodes)
        console.log('Converted nodes:', flowNodes)
      } else {
        onNodesChange([])
      }

      if (pipeline.edges && Array.isArray(pipeline.edges)) {
        const flowEdges: Edge[] = pipeline.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: edge.type || 'custom',
          animated: false,
          data: edge.data || { label: `${edge.sourceHandle} → ${edge.targetHandle}` }
        }))
        onEdgesChange(flowEdges)
        console.log('Converted edges:', JSON.stringify(flowEdges))
      } else {
        onEdgesChange([])
      }

      if (onPipelineDataChange) {
        onPipelineDataChange(pipeline)
      }

      setPipelineLoaded(true)
      setLastFileContent(fileContent || null)
      toast.success('Pipeline loaded successfully')

    } catch (error) {
      console.error('Error loading pipeline:', error)
      toast.error('Failed to parse pipeline data')
      setPipelineLoaded(false)
    }
  }, [fileContent, lastFileContent, onNodesChange, onEdgesChange, onMetadataChange, onPipelineDataChange, convertPipelineNodeToFlowNode])

  // Load pipeline when file content changes, but only if it actually changed
  useEffect(() => {
    loadPipeline()
  }, [loadPipeline])

  return {
    pipelineLoaded,
    pipelineData,
    reloadPipeline: loadPipeline
  }
}
