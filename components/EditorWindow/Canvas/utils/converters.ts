import { Node, Edge } from 'reactflow';
import { PipelineNode, PipelineEdge, PipelineFile, Position, NodeData } from '../types/pipeline';

/**
 * Convert pipeline nodes to React Flow nodes
 * @param pipelineNodes - Array of pipeline nodes
 * @returns Array of React Flow nodes
 */
export function convertToFlowNodes(pipelineNodes: PipelineNode[] = []): Node[] {
  if (!pipelineNodes || !Array.isArray(pipelineNodes)) {
    console.warn('Invalid pipeline nodes provided to convertToFlowNodes:', pipelineNodes);
    return [];
  }
  
  return pipelineNodes.map((node) => ({
    id: node.id,
    type: node.type || 'dynamicNode',
    position: node.position || { x: 0, y: 0 },
    data: {
      ...node.data,
      label: node.data?.title || node.id,
      description: node.data?.description || '',
      inputs: node.data?.source || [],
      outputs: node.data?.source || [],
      code: node.data?.source_code || '',
      language: node.data?.language || 'javascript',
    },
  }));
}

/**
 * Convert pipeline edges to React Flow edges
 * @param pipelineEdges - Array of pipeline edges
 * @returns Array of React Flow edges
 */
export function convertToFlowEdges(pipelineEdges: PipelineEdge[] = []): Edge[] {
  if (!pipelineEdges || !Array.isArray(pipelineEdges)) {
    console.warn('Invalid pipeline edges provided to convertToFlowEdges:', pipelineEdges);
    return [];
  }
  
  return pipelineEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type
  }));
}

/**
 * Convert React Flow nodes to pipeline nodes
 * @param flowNodes - Array of React Flow nodes
 * @returns Array of pipeline nodes
 */
export function convertToPipelineNodes(flowNodes: Node[] = []): PipelineNode[] {
  if (!flowNodes || !Array.isArray(flowNodes)) {
    console.warn('Invalid flow nodes provided to convertToPipelineNodes:', flowNodes);
    return [];
  }
  
  return flowNodes.map((node) => {
    const nodeData: NodeData = {
      title: node.data?.label || node.id,
      description: node.data?.description || '',
      language: node.data?.language || 'javascript',
      source_code: node.data?.code || '',
      status: node.data?.status || 'ready',
      inputs: [],
      outputs: []
    };
    
    return {
      id: node.id,
      type: node.type || 'dynamicNode',
      position: node.position,
      data: nodeData,
      draggable: true,
      selectable: true,
      deletable: true
    };
  });
}

/**
 * Convert React Flow edges to pipeline edges
 * @param flowEdges - Array of React Flow edges
 * @returns Array of pipeline edges
 */
export function convertToPipelineEdges(flowEdges: Edge[] = []): PipelineEdge[] {
  if (!flowEdges || !Array.isArray(flowEdges)) {
    console.warn('Invalid flow edges provided to convertToPipelineEdges:', flowEdges);
    return [];
  }
  
  return flowEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    type: edge.type
  }));
}

/**
 * Create a default flow file structure
 * @returns Default pipeline file structure
 */
export function createDefaultFlow(): PipelineFile {
  const timestamp = new Date().toISOString();
  
  return {
    id: `pipeline_${Math.random().toString(36).substr(2, 9)}`,
    name: 'New Pipeline',
    description: 'A new pipeline created in Genome Studio',
    nodes: [],
    edges: [],
    created: timestamp,
    modified: timestamp,
    version: '1.0.0',
    author: 'Genome Studio User',
    config: {
      auto_layout: true,
      execution_mode: 'sequential',
      default_language: 'javascript',
      environment: 'node',
      global_timeout: 30000
    }
  };
}
