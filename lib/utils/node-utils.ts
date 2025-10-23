import { CustomNode } from "../services/custom-node-service";

/**
 * Converts a custom node from the API format to a React Flow node format
 */
export interface FlowNodeData {
  title: string;
  description: string;
  inputs: unknown[];
  outputs: unknown[];
  language: string;
  function_name: string;
  source_code: string;
  node_id: string;
  is_public: boolean;
  tags: string[];
  instance_id: string;
  onNodeDelete?: (nodeId: string) => void;
  // Add index signature to satisfy Record<string, unknown> constraint
  [key: string]: unknown;
}

export const createFlowNodeFromCustomNode = (customNode: CustomNode, position: { x: number, y: number }) => {
  // Generate a unique ID for each node instance using timestamp and random number
  // This ensures multiple instances of the same node can be added to the canvas
  const uniqueInstanceId = generateUniqueNodeId();
  
  return {
    id: uniqueInstanceId,
    type: 'dynamicCustomNode', // This should match the registered node type in ReactFlow
    position,
    data: {
      title: customNode.title,
      description: customNode.description,
      inputs: customNode.inputs || [],
      outputs: customNode.outputs || [],
      language: customNode.language,
      function_name: customNode.function_name,
      source_code: customNode.source_code,
      node_id: customNode.id || customNode.node_id, // Keep reference to original node ID
      is_public: customNode.is_public,
      tags: customNode.tags,
      instance_id: uniqueInstanceId // Store the instance ID for reference
    }
  };
};

/**
 * Generates a unique node ID
 */
export const generateUniqueNodeId = () => {
  return `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Calculates a position for a new node based on the current viewport
 */
export const calculateNewNodePosition = (reactFlowInstance: { getViewport: () => { x: number; y: number; zoom: number } } | null) => {
  if (!reactFlowInstance) {
    return { x: 100, y: 100 };
  }
  
  const { x, y, zoom } = reactFlowInstance.getViewport();
  
  // Calculate center of the current viewport
  const centerX = -x / zoom + window.innerWidth / 2 / zoom;
  const centerY = -y / zoom + window.innerHeight / 2 / zoom;
  
  return { x: centerX, y: centerY };
};
