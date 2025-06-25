import { PipelineFile } from '../types/pipeline';

/**
 * Validate the structure of flow data
 * @param data - Flow data to validate
 * @returns Boolean indicating if the data is valid
 */
export function validateFlowData(data: any): boolean {
  if (!data) return false;
  
  // Check for required top-level fields
  if (!data.id || !data.name) {
    console.error('Flow data missing required fields: id or name');
    return false;
  }
  
  // Check that nodes is an array
  if (data.nodes && !Array.isArray(data.nodes)) {
    console.error('Flow data nodes must be an array');
    return false;
  }
  
  // Check that edges is an array
  if (data.edges && !Array.isArray(data.edges)) {
    console.error('Flow data edges must be an array');
    return false;
  }
  
  // Check node structure if nodes exist
  if (data.nodes && data.nodes.length > 0) {
    const invalidNode = data.nodes.find((node: any) => !node.id);
    if (invalidNode) {
      console.error('Found node without required id field');
      return false;
    }
  }
  
  // Check edge structure if edges exist
  if (data.edges && data.edges.length > 0) {
    const invalidEdge = data.edges.find(
      (edge: any) => !edge.id || !edge.source || !edge.target
    );
    if (invalidEdge) {
      console.error('Found edge without required fields: id, source, or target');
      return false;
    }
  }
  
  return true;
}

/**
 * Normalize IDs in flow data to ensure uniqueness
 * @param data - Flow data to normalize
 * @returns Normalized flow data
 */
export function normalizeIds(data: PipelineFile): PipelineFile {
  if (!data) return data;
  
  // Create a copy of the data
  const normalizedData = { ...data };
  
  // Ensure pipeline ID exists
  if (!normalizedData.id) {
    normalizedData.id = `pipeline_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Normalize node IDs
  if (normalizedData.nodes && Array.isArray(normalizedData.nodes)) {
    normalizedData.nodes = normalizedData.nodes.map((node) => {
      // If node has no ID, generate one
      if (!node.id) {
        return {
          ...node,
          id: `node_${Math.random().toString(36).substr(2, 9)}`,
        };
      }
      return node;
    });
  }
  
  // Normalize edge IDs
  if (normalizedData.edges && Array.isArray(normalizedData.edges)) {
    normalizedData.edges = normalizedData.edges.map((edge) => {
      // If edge has no ID, generate one based on source and target
      if (!edge.id) {
        return {
          ...edge,
          id: `edge_${edge.source}_${edge.sourceHandle || ''}_${edge.target}_${edge.targetHandle || ''}`,
        };
      }
      return edge;
    });
  }
  
  return normalizedData;
}

/**
 * Clean JSON content by removing comments and fixing common issues
 * @param content - JSON content to clean
 * @returns Cleaned JSON content
 */
export function cleanJsonContent(content: string): string {
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
}
