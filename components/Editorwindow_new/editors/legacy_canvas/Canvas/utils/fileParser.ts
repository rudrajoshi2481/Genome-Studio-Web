import { PipelineFile, PipelineNode, PipelineEdge } from '../types/pipeline';

/**
 * Clean JSON content by fixing common issues
 * @param content Raw JSON content as string
 * @returns Cleaned JSON content
 */
export function cleanJsonContent(content: string): string {
  if (!content) return '{}';
  
  let cleanedContent = content;
  
  // Remove malformed ellipsis patterns
  cleanedContent = cleanedContent.replace(/\.{3,}/g, '');
  
  // Fix trailing commas before closing brackets/braces
  cleanedContent = cleanedContent.replace(/,(\s*[\]}])/g, '$1');
  
  // Fix unquoted property names
  cleanedContent = cleanedContent.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  return cleanedContent;
}

/**
 * Normalize IDs in the flow data to handle discrepancies between hyphens and underscores
 * @param data Parsed flow data
 * @returns Normalized flow data
 */
export function normalizeIds(data: PipelineFile): PipelineFile {
  if (!data || !data.nodes || !data.edges) {
    return data;
  }

  // Create a mapping of original IDs to normalized IDs
  const idMap = new Map<string, string>();
  
  // Normalize node IDs
  data.nodes.forEach(node => {
    const normalizedId = node.id.replace(/[-_]/g, '_');
    idMap.set(node.id, normalizedId);
    node.id = normalizedId;
  });
  
  // Update edge source and target IDs
  data.edges.forEach(edge => {
    if (idMap.has(edge.source)) {
      edge.source = idMap.get(edge.source) || edge.source;
    }
    if (idMap.has(edge.target)) {
      edge.target = idMap.get(edge.target) || edge.target;
    }
  });
  
  return data;
}

/**
 * Validate the flow data structure to ensure required fields exist
 * @param data Parsed flow data
 * @returns Boolean indicating if the data is valid
 */
export function validateFlowData(data: any): boolean {
  if (!data) return false;
  
  // Check for required top-level fields
  if (!data.id || !data.name || !Array.isArray(data.nodes)) {
    console.error('Missing required fields in flow data:', { 
      hasId: !!data.id, 
      hasName: !!data.name, 
      hasNodesArray: Array.isArray(data.nodes) 
    });
    return false;
  }
  
  // Check for required node fields
  const validNodes = data.nodes.every((node: any) => {
    const isValid = node && node.id && node.type && node.position && node.data;
    if (!isValid) {
      console.error('Invalid node structure:', node);
    }
    return isValid;
  });
  
  if (!validNodes) return false;
  
  // Check for required edge fields if edges exist
  if (data.edges && Array.isArray(data.edges)) {
    const validEdges = data.edges.every((edge: any) => {
      const isValid = edge && edge.id && edge.source && edge.target;
      if (!isValid) {
        console.error('Invalid edge structure:', edge);
      }
      return isValid;
    });
    
    if (!validEdges) return false;
  }
  
  return true;
}

/**
 * Parse pipeline file content with validation and error handling
 * @param fileContent Raw file content as string
 * @returns Parsed PipelineFile or null if parsing failed
 */
export function parsePipelineFile(fileContent: string): PipelineFile | null {
  try {
    // Clean the JSON content before parsing
    const cleanContent = cleanJsonContent(fileContent);
    
    // Parse the cleaned content
    const parsed = JSON.parse(cleanContent) as PipelineFile;
    
    // Validate the parsed data
    if (!validateFlowData(parsed)) {
      console.error('Invalid pipeline file: missing required fields');
      return null;
    }
    
    // Normalize IDs in the parsed data
    const normalizedData = normalizeIds(parsed);
    
    return normalizedData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Failed to parse JSON: ${error.message}`);
    } else {
      console.error(`Error parsing pipeline file:`, error);
    }
    return null;
  }
}

/**
 * Create a minimal valid default flow structure
 * @returns Default PipelineFile structure
 */
export function createDefaultFlow(): PipelineFile {
  const timestamp = new Date().toISOString();
  return {
    id: `flow_${Date.now()}`,
    name: 'New Pipeline',
    description: 'A new pipeline',
    version: '1.0.0',
    created: timestamp,
    modified: timestamp,
    author: 'User',
    config: {
      auto_layout: false,
      execution_mode: 'sequential',
      default_language: 'python',
      environment: 'default',
      global_timeout: 3600
    },
    nodes: [],
    edges: []
  };
}

/**
 * Convert PipelineNode objects to ReactFlow nodes
 * @param nodes Array of PipelineNode objects
 * @returns Array of ReactFlow Node objects
 */
export function convertToFlowNodes(nodes: PipelineNode[]): any[] {
  if (!nodes || !Array.isArray(nodes)) return [];
  
  return nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      // Ensure required fields exist
      title: node.data.title || 'Untitled Node',
      description: node.data.description || '',
      language: node.data.language || 'python',
      inputs: node.data.inputs || [],
      outputs: node.data.outputs || [],
      source_code: node.data.source_code || node.data.source?.join('\n') || '',
      function_name: node.data.function_name || 'function'
    },
    draggable: node.draggable !== false,
    selectable: node.selectable !== false,
    deletable: node.deletable !== false
  }));
}

/**
 * Convert PipelineEdge objects to ReactFlow edges
 * @param edges Array of PipelineEdge objects
 * @returns Array of ReactFlow Edge objects
 */
export function convertToFlowEdges(edges: PipelineEdge[]): any[] {
  if (!edges || !Array.isArray(edges)) return [];
  
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    type: edge.type || 'default'
  }));
}

/**
 * Convert ReactFlow nodes back to pipeline nodes
 * @param nodes Array of ReactFlow Node objects
 * @returns Array of PipelineNode objects
 */
export function convertToPipelineNodes(nodes: any[]): PipelineNode[] {
  if (!nodes || !Array.isArray(nodes)) return [];
  
  return nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      // Convert source_code to source array if needed
      source: node.data.source || (node.data.source_code ? [node.data.source_code] : [])
    },
    draggable: node.draggable,
    selectable: node.selectable,
    deletable: node.deletable,
    hidden: node.hidden,
    selected: node.selected
  }));
}

/**
 * Convert ReactFlow edges back to pipeline edges
 * @param edges Array of ReactFlow Edge objects
 * @returns Array of PipelineEdge objects
 */
export function convertToPipelineEdges(edges: any[]): PipelineEdge[] {
  if (!edges || !Array.isArray(edges)) return [];
  
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    type: edge.type
  }));
}

/**
 * Ensure file path has .flow extension
 * @param filePath Original file path
 * @returns File path with .flow extension
 */
export function ensureFlowExtension(filePath: string): string {
  // Only add .flow extension if the file has no extension
  if (!filePath.includes('.')) {
    return `${filePath}.flow`;
  }
  return filePath;
}
