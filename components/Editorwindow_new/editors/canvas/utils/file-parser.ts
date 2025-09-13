// File Parser for Flow JSON data
import { Node, Edge } from 'reactflow';

// Types for the flow data structure
export interface FlowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    title: string;
    description: string;
    language?: string;
    source?: string[];
    source_code?: string;
    function_name?: string;
    status?: string;
    execution_count?: number;
    inputs?: any[];
    outputs?: any[];
    logs?: any[];
    errors?: any[];
    warnings?: any[];
    stdout?: string[];
    stderr?: string[];
    metadata?: any;
    ui?: any;
    dependencies?: any[];
    config?: any;
    [key: string]: any;
  };
  draggable?: boolean;
  selectable?: boolean;
  deletable?: boolean;
  selected?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  type?: string;
}

export interface FlowData {
  id: string;
  name: string;
  description?: string;
  version?: string;
  created?: string;
  modified?: string;
  author?: string;
  config?: any;
  nodes: FlowNode[];
  edges: FlowEdge[];
  global_variables?: Record<string, any>;
  shared_imports?: string[];
  execution_history?: any[];
}

/**
 * Parse flow data from JSON string
 * @param jsonString - JSON string to parse
 * @returns Parsed flow data or null if parsing fails
 */
export const parseFlowData = (jsonString: string): FlowData | null => {
  try {
    // Clean and parse the JSON content
    const cleanedContent = cleanJsonContent(jsonString);
    const parsedData = JSON.parse(cleanedContent);
    
    // Validate the parsed data
    if (!validateFlowData(parsedData)) {
      console.error('Invalid flow data structure');
      return null;
    }
    
    // Return the parsed data
    return parsedData;
  } catch (error) {
    console.error('Error parsing flow data:', error);
    return null;
  }
};

/**
 * Clean JSON content by removing comments and fixing common issues
 * @param content - JSON content to clean
 * @returns Cleaned JSON content
 */
export const cleanJsonContent = (content: string): string => {
  if (!content) return '{}';
  
  try {
    // Remove comments (both // and /* */)
    let cleanedContent = content
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // Remove trailing commas
    cleanedContent = cleanedContent
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    
    // Handle empty content
    if (cleanedContent.trim() === '') {
      return '{}';
    }
    
    // Verify it's valid JSON by parsing and stringifying
    const parsed = JSON.parse(cleanedContent);
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Error cleaning JSON content:', error);
    throw new Error(`Invalid JSON content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validate the structure of flow data
 * @param data - Flow data to validate
 * @returns Boolean indicating if the data is valid
 */
export const validateFlowData = (data: any): boolean => {
  if (!data) return false;
  
  // Check for required top-level fields
  if (!data.id || !data.name) {
    console.error('Flow data missing required fields: id or name');
    return false;
  }
  
  // Check that nodes is an array
  if (!Array.isArray(data.nodes)) {
    console.error('Flow data nodes must be an array');
    return false;
  }
  
  // Check that edges is an array
  if (!Array.isArray(data.edges)) {
    console.error('Flow data edges must be an array');
    return false;
  }
  
  // Check node structure if nodes exist
  if (data.nodes.length > 0) {
    const invalidNode = data.nodes.find((node: any) => !node.id || !node.type || !node.position);
    if (invalidNode) {
      console.error('Found node without required fields: id, type, or position');
      return false;
    }
  }
  
  // Check edge structure if edges exist
  if (data.edges.length > 0) {
    const invalidEdge = data.edges.find(
      (edge: any) => !edge.id || !edge.source || !edge.target
    );
    if (invalidEdge) {
      console.error('Found edge without required fields: id, source, or target');
      return false;
    }
  }
  
  return true;
};

/**
 * Convert flow nodes to ReactFlow nodes
 * @param nodes - Flow nodes to convert
 * @returns ReactFlow nodes
 */
export const convertToReactFlowNodes = (nodes: FlowNode[]): Node[] => {
  if (!nodes || !Array.isArray(nodes)) return [];
  
  return nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      label: node.data.title || node.id
    },
    draggable: node.draggable !== false,
    selectable: node.selectable !== false,
    deletable: node.deletable !== false
  }));
};

/**
 * Convert flow edges to ReactFlow edges
 * @param edges - Flow edges to convert
 * @returns ReactFlow edges
 */
export const convertToReactFlowEdges = (edges: FlowEdge[]): Edge[] => {
  if (!edges || !Array.isArray(edges)) return [];
  
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    type: edge.type || 'default',
    animated: true,
    style: { 
      stroke: '#555',
      strokeDasharray: '5,5'
    }
  }));
};

/**
 * Convert ReactFlow nodes back to flow nodes
 * @param nodes - ReactFlow nodes to convert
 * @returns Flow nodes
 */
export const convertToFlowNodes = (nodes: Node[]): FlowNode[] => {
  if (!nodes || !Array.isArray(nodes)) return [];
  
  return nodes.map(node => ({
    id: node.id,
    type: node.type || 'default',
    position: node.position,
    data: {
      ...node.data,
      title: node.data.title || node.data.label || node.id
    },
    draggable: node.draggable !== false,
    selectable: node.selectable !== false,
    deletable: node.deletable !== false
  }));
};

/**
 * Convert flow nodes to ReactFlow nodes with proper CustomNode support
 * @param nodes - Flow nodes to convert
 * @returns ReactFlow nodes
 */
export const convertFlowNodesToReactFlow = (nodes: FlowNode[]): Node[] => {
  if (!nodes || !Array.isArray(nodes)) return [];
  
  return nodes.map(node => ({
    id: node.id,
    // Use customNode type for nodes with inputs/outputs, otherwise use the original type
    type: node.data.inputs || node.data.outputs ? 'customNode' : (node.type || 'customNode'),
    position: node.position,
    data: {
      ...node.data,
      // Ensure required fields for CustomNode
      title: node.data.title || node.id,
      description: node.data.description || '',
      inputs: node.data.inputs || [],
      outputs: node.data.outputs || [],
      language: node.data.language || 'python',
      function_name: node.data.function_name || 'function',
      source_code: node.data.source_code || node.data.source?.join('\n') || '',
      // Add onNodeDelete handler placeholder (will be added by Canvas component)
      onNodeDelete: undefined
    },
    draggable: node.draggable !== false,
    selectable: node.selectable !== false,
    deletable: node.deletable !== false
  }));
};

/**
 * Convert ReactFlow edges back to flow edges
 * @param edges - ReactFlow edges to convert
 * @returns Flow edges
 */
export const convertToFlowEdges = (edges: Edge[]): FlowEdge[] => {
  if (!edges || !Array.isArray(edges)) return [];
  
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle || null,
    target: edge.target,
    targetHandle: edge.targetHandle || null,
    type: edge.type || 'default'
  }));
};

/**
 * Result of flow format validation
 */
export interface FlowValidationResult {
  isValid: boolean;
  isParseable: boolean;
  hasRequiredProps: boolean;
  hasValidStructure: boolean;
  missingProps: string[];
  parsedData: FlowData | null;
  error?: string;
}

/**
 * Check if the content is in the expected flow format
 * @param content - Content to check
 * @returns Validation result with flags for different aspects of validation
 */
export const isValidFlowFormat = (content: string | null | undefined): FlowValidationResult => {
  const result: FlowValidationResult = {
    isValid: false,
    isParseable: false,
    hasRequiredProps: false,
    hasValidStructure: false,
    missingProps: [],
    parsedData: null
  };
  
  if (!content) {
    result.error = 'No content provided';
    return result;
  }
  
  try {
    // Clean the JSON content first
    const cleanedContent = cleanJsonContent(content);
    
    // Try to parse the content
    const parsed = JSON.parse(cleanedContent);
    result.isParseable = true;
    
    // Check for required top-level properties
    const requiredProps = ['id', 'name', 'nodes', 'edges'];
    const missingProps = requiredProps.filter(prop => !(prop in parsed));
    result.missingProps = missingProps;
    result.hasRequiredProps = missingProps.length === 0;
    
    // Check that nodes and edges are arrays
    result.hasValidStructure = 
      Array.isArray(parsed.nodes) && 
      Array.isArray(parsed.edges);
    
    // Set overall validity
    result.isValid = result.hasRequiredProps && result.hasValidStructure;
    
    // If valid, store the parsed data
    if (result.isValid) {
      result.parsedData = parsed as FlowData;
    }
    
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error parsing content';
    console.error('Error validating flow format:', error);
    return result;
  }
};

/**
 * Create a new empty flow data structure
 * @param name - Name of the flow
 * @returns New flow data
 */
export const createEmptyFlow = (name: string = 'New Flow'): FlowData => {
  const now = new Date().toISOString();
  const id = `flow_${Math.random().toString(36).substring(2, 11)}`;
  
  return {
    id,
    name,
    description: 'A new flow',
    version: '1.0.0',
    created: now,
    modified: now,
    author: '',
    config: {
      auto_layout: true,
      execution_mode: 'sequential',
      default_language: 'python',
      environment: 'default'
    },
    nodes: [],
    edges: [],
    global_variables: {},
    shared_imports: []
  };
};

/**
 * Serialize flow data to JSON string
 * @param flowData - Flow data to serialize
 * @returns JSON string representation of the flow data
 */
export const serializeFlowData = (flowData: FlowData): string => {
  try {
    // Update the modified timestamp
    const updatedFlow = {
      ...flowData,
      modified: new Date().toISOString()
    };
    
    // Convert to JSON string with pretty formatting
    return JSON.stringify(updatedFlow, null, 2);
  } catch (error) {
    console.error('Error serializing flow data:', error);
    throw new Error(`Failed to serialize flow data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};