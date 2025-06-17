import { DataProcessingPipeline, PipelineNode, PipelineEdge } from '../types/pipeline-flow';
import { Node, Edge } from '@xyflow/react';
import { FlowNodeData } from './node-utils';

// Convert pipeline nodes to React Flow nodes
export const convertPipelineNodesToFlowNodes = (
  pipelineNodes: PipelineNode[], 
  onNodeDelete: (nodeId: string) => void
): Node<FlowNodeData>[] => {
  return pipelineNodes.map(pNode => {
    // Create a React Flow node from the pipeline node
    return {
      id: pNode.id,
      type: 'dynamicCustomNode',
      position: pNode.position,
      // Add width and height for resizable nodes
      width: pNode.width || 280,
      height: pNode.height || undefined,
      // Set resizing flag to true
      resizing: true,
      data: {
        title: pNode.data.title,
        description: pNode.data.description,
        inputs: pNode.data.inputs.map(input => ({
          id: input.id,
          name: input.name,
          type: input.type,
          description: input.description || ''
        })),
        outputs: pNode.data.outputs.map(output => ({
          id: output.id,
          name: output.name,
          type: output.type,
          description: output.description || ''
        })),
        language: pNode.data.language,
        function_name: pNode.data.title,
        source_code: pNode.data.source.join('\n'),
        node_id: pNode.id,
        is_public: true,
        tags: pNode.data.metadata.tags,
        instance_id: pNode.id,
        // Add execution information
        status: pNode.data.status,
        execution_count: pNode.data.execution_count,
        execution_timing: pNode.data.execution_timing,
        // Add logs
        logs: pNode.data.logs,
        onNodeDelete
      },
      draggable: pNode.draggable,
      selectable: pNode.selectable
    } as Node<FlowNodeData>;
  });
};

// Convert pipeline edges to React Flow edges
export const convertPipelineEdgesToFlowEdges = (pipelineEdges: PipelineEdge[]): Edge[] => {
  return pipelineEdges.map(pEdge => {
    return {
      id: pEdge.id,
      source: pEdge.source,
      sourceHandle: pEdge.sourceHandle,
      target: pEdge.target,
      targetHandle: pEdge.targetHandle,
      type: 'custom'
    };
  });
};

// Convert React Flow nodes to pipeline nodes
export const convertFlowNodesToPipelineNodes = (flowNodes: Node<FlowNodeData>[]): PipelineNode[] => {
  return flowNodes.map(fNode => {
    const nodeData = fNode.data;
    
    // Create a pipeline node from the React Flow node
    return {
      id: fNode.id,
      type: 'code_editor',
      position: { x: fNode.position.x, y: fNode.position.y },
      data: {
        title: nodeData.title,
        description: nodeData.description || '',
        language: nodeData.language || 'python',
        source: nodeData.source_code ? nodeData.source_code.split('\n') : [],
        status: 'pending',
        execution_count: 0,
        execution_timing: {
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration: 0,
          queued_time: new Date().toISOString()
        },
        inputs: nodeData.inputs ? nodeData.inputs.map(input => ({
          id: input.id || `input-${Math.random().toString(36).substr(2, 9)}`,
          name: input.name,
          type: input.type,
          required: true,
          description: input.description || '',
          data_type: input.type,
          source_node_id: '',
          default_value: null
        })) : [],
        outputs: nodeData.outputs ? nodeData.outputs.map(output => ({
          id: output.id || `output-${Math.random().toString(36).substr(2, 9)}`,
          name: output.name,
          type: output.type,
          description: output.description || '',
          data_type: output.type,
          preview: '',
          size: 0
        })) : [],
        logs: [],
        errors: [],
        warnings: [],
        stdout: [],
        stderr: [],
        metadata: {
          tags: nodeData.tags || [],
          author: 'User',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          notes: '',
          collapsed: false,
          pinned: false,
          version: 1,
          dependencies: null,
          environment: 'default'
        },
        ui: {
          color: '#3b82f6',
          icon: 'code',
          width: 300,
          height: 200,
          theme: 'auto',
          font_size: 14,
          show_line_numbers: true
        },
        dependencies: [],
        config: {
          timeout: 30,
          memory_limit: 512,
          cpu_limit: 50,
          auto_run: false,
          cache_results: true
        }
      },
      draggable: true,
      selectable: true,
      deletable: true,
      hidden: false,
      selected: false
    };
  });
};

// Convert React Flow edges to pipeline edges
export const convertFlowEdgesToPipelineEdges = (flowEdges: Edge[]): PipelineEdge[] => {
  return flowEdges.map(fEdge => {
    return {
      id: fEdge.id,
      source: fEdge.source,
      sourceHandle: fEdge.sourceHandle || 'a',
      target: fEdge.target,
      targetHandle: fEdge.targetHandle || 'input-1'
    };
  });
};

// Load pipeline data from JSON
export const loadPipelineFromJson = async (filePath: string): Promise<DataProcessingPipeline | null> => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load pipeline: ${response.statusText}`);
    }
    const data = await response.json();
    return data as DataProcessingPipeline;
  } catch (error) {
    console.error('Error loading pipeline:', error);
    return null;
  }
};

// Save pipeline data to JSON
export const savePipelineToJson = async (
  pipeline: DataProcessingPipeline, 
  filePath: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/save-pipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pipeline,
        filePath
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save pipeline: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving pipeline:', error);
    return false;
  }
};

// Create a new pipeline with current nodes and edges
export const createPipelineFromCurrentState = (
  nodes: Node<FlowNodeData>[], 
  edges: Edge[],
  pipelineId: string = 'flow_001',
  name: string = 'Data Processing Pipeline'
): DataProcessingPipeline => {
  const pipelineNodes = convertFlowNodesToPipelineNodes(nodes);
  const pipelineEdges = convertFlowEdgesToPipelineEdges(edges);
  
  const now = new Date().toISOString();
  
  return {
    id: pipelineId,
    name: name,
    description: 'A flow for data processing and visualization',
    version: '1.0.0',
    created: now,
    modified: now,
    author: 'User',
    config: {
      auto_layout: true,
      execution_mode: 'sequential',
      default_language: 'python',
      environment: 'default',
      global_timeout: 300
    },
    nodes: pipelineNodes,
    edges: pipelineEdges,
    global_variables: {},
    shared_imports: [
      'import pandas as pd',
      'import numpy as np',
      'import matplotlib.pyplot as plt'
    ],
    execution_history: []
  };
};
