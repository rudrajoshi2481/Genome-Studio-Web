import { Node, Edge } from 'reactflow';

// Safe function to handle source code conversion
const safeSourceCodeToArray = (source: any): string[] => {
  if (!source) {
    return ['# No code'];
  }
  
  if (Array.isArray(source)) {
    return source.filter(line => typeof line === 'string');
  }
  
  if (typeof source === 'string') {
    return source.split('\n');
  }
  
  return ['# No code'];
};

// Safe function to handle source code to string conversion
const safeSourceCodeToString = (source: any): string => {
  if (!source) {
    return '# No code';
  }
  
  if (Array.isArray(source)) {
    return source.filter(line => typeof line === 'string').join('\n');
  }
  
  if (typeof source === 'string') {
    return source;
  }
  
  return '# No code';
};

export const convertPipelineNodesToFlowNodes = (
  pipelineNodes: any[], 
  onNodeDelete?: (nodeId: string) => void
): Node[] => {
  return pipelineNodes.map((node) => ({
    id: node.id,
    type: 'dynamicCustomNode',
    position: node.position || { x: 0, y: 0 },
    data: {
      title: node.data?.title || 'Untitled Node',
      description: node.data?.description || '',
      language: node.data?.language || 'python',
      source_code: safeSourceCodeToString(node.data?.source),
      inputs: node.data?.inputs || [],
      outputs: node.data?.outputs || [],
      node_id: node.data?.node_id || node.id,
      tags: node.data?.metadata?.tags || [],
      onNodeDelete: onNodeDelete,
    },
    draggable: true,
    selectable: true,
    deletable: true,
  }));
};

export const convertPipelineEdgesToFlowEdges = (pipelineEdges: any[]): Edge[] => {
  return pipelineEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    type: 'custom',
  }));
};

export const convertFlowNodesToPipelineNodes = (flowNodes: Node[]): any[] => {
  return flowNodes.map((node) => ({
    id: node.id,
    type: node.type || 'code_editor',
    position: node.position,
    data: {
      title: node.data?.title || 'Untitled Node',
      description: node.data?.description || '',
      language: node.data?.language || 'python',
      source: safeSourceCodeToArray(node.data?.source_code),
      inputs: node.data?.inputs || [],
      outputs: node.data?.outputs || [],
      status: 'idle',
      execution_count: 0,
      logs: [],
      errors: [],
      warnings: [],
      stdout: [],
      stderr: [],
      metadata: {
        tags: node.data?.tags || [],
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
    },
  }));
};

export const convertFlowEdgesToPipelineEdges = (flowEdges: Edge[]): any[] => {
  return flowEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || '',
    targetHandle: edge.targetHandle || '',
    type: edge.type,
  }));
};
