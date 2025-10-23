import { getServerConfig } from '@/config/server';

const config = getServerConfig();
// Construct the full API URL with protocol, host, port, and base path
const API_URL = `${config.api.protocol}://${config.api.host}:${config.api.port}${config.api.baseUrl}`;

export interface CustomNodeIO {
  id: string;
  name: string;
  type: string;
}

export interface CustomNodeData {
  title: string;
  description: string;
  language: string;
  function_name: string;
  source: string;
  inputs: CustomNodeIO[];
  outputs: CustomNodeIO[];
}

export interface CustomNode {
  id: string;
  node_id: string;
  title: string;
  description: string;
  function_name: string;
  language: string;
  source_code: string;
  inputs: CustomNodeIO[];
  outputs: CustomNodeIO[];
  tags: string[];
  is_public: boolean;
  node_type?: string;  // "customNode" or "dataTypeNode"
  user_id: number;
  created_at: string;
  updated_at: string | null;
}

/**
 * Create a new custom node
 * @param token JWT authentication token
 * @param nodeData Node data to create
 * @returns Created custom node
 */
export const createCustomNode = async (token: string, nodeData: Partial<CustomNodeData>): Promise<CustomNode> => {
  try {
    console.log('Creating custom node:', nodeData);
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/`;
    console.log(`Making POST request to: ${fullUrl}`);
    console.log('Node data:', JSON.stringify(nodeData, null, 2));
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      },
      body: JSON.stringify(nodeData)
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error creating custom node:', response.status, errorText);
      throw new Error(`Failed to create custom node: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Create node response:', data);
    return data;
  } catch (error) {
    console.error('Error in createCustomNode:', error);
    throw error;
  }
};

/**
 * Fetch all custom nodes for the current user
 * @param token JWT authentication token
 * @returns Array of custom nodes
 */
export const fetchCustomNodes = async (token: string): Promise<CustomNode[]> => {
  try {
    console.log('Fetching custom nodes with token:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    // Log the full API URL for debugging
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/`;
    console.log(`Making API request to: ${fullUrl}`);
    console.log(`API config:`, {
      protocol: config.api.protocol,
      host: config.api.host,
      port: config.api.port,
      baseUrl: config.api.baseUrl
    });
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching custom nodes:', response.status, errorText);
      throw new Error(`Failed to fetch custom nodes: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.length} custom nodes:`, data);
    return data;
  } catch (error) {
    console.error('Error in fetchCustomNodes:', error);
    throw error;
  }
};

/**
 * Delete a custom node by ID
 * @param token JWT authentication token
 * @param nodeId ID of the node to delete
 * @returns Success message
 */
export const deleteCustomNode = async (token: string, nodeId: string | number): Promise<{ message: string }> => {
  try {
    console.log(`Deleting custom node with ID: ${nodeId}`);
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/${nodeId}`;
    console.log(`Making DELETE request to: ${fullUrl}`);
    console.log(`API config:`, {
      protocol: config.api.protocol,
      host: config.api.host,
      port: config.api.port,
      baseUrl: config.api.baseUrl
    });
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Failed to delete custom node: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (parseError) {
        // If response is not JSON, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          // If we can't get text either, use the default message
        }
      }
      
      console.error('Error deleting custom node:', errorMessage);
      throw new Error(errorMessage);
    }

    // Try to parse response as JSON
    try {
      const data = await response.json();
      console.log('Delete response:', data);
      return data;
    } catch (parseError) {
      // If response is not JSON, return a generic success message
      return { message: 'Custom node deleted successfully' };
    }
  } catch (error) {
    console.error('Error in deleteCustomNode:', error);
    throw error;
  }
};

/**
 * Update an existing custom node
 * @param token JWT authentication token
 * @param nodeId ID of the node to update
 * @param nodeData Updated node data
 * @returns Updated custom node
 */
export const updateCustomNode = async (token: string, nodeId: string | number, nodeData: Partial<CustomNodeData>): Promise<CustomNode> => {
  try {
    console.log(`Updating custom node with ID: ${nodeId}`);
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    // Log the full API URL for debugging
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/${nodeId}`;
    console.log(`Making API request to: ${fullUrl}`);
    console.log('Update payload:', JSON.stringify(nodeData, null, 2));
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      },
      body: JSON.stringify(nodeData)
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Failed to update custom node: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (parseError) {
        // If response is not JSON, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          // If we can't get text either, use the default message
        }
      }
      
      console.error('Error updating custom node:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Update response:', data);
    return data;
  } catch (error) {
    console.error('Error in updateCustomNode:', error);
    throw error;
  }
};

/**
 * Duplicate a custom node
 * @param token JWT authentication token
 * @param nodeId ID of the node to duplicate
 * @returns The newly created duplicate node
 */
export const duplicateCustomNode = async (token: string, nodeId: string | number): Promise<CustomNode> => {
  try {
    console.log(`Duplicating custom node: ${nodeId}`);
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/${nodeId}/duplicate`;
    console.log(`Making POST request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error duplicating node:', response.status, errorText);
      throw new Error(`Failed to duplicate node: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Duplicate node response:', data);
    return data;
  } catch (error) {
    console.error('Error in duplicateCustomNode:', error);
    throw error;
  }
};

/**
 * Toggle favorite status for a custom node
 * @param token JWT authentication token
 * @param nodeId ID of the node to toggle favorite
 * @returns Updated favorite status
 */
export const toggleFavoriteNode = async (token: string, nodeId: string): Promise<{ is_favorited: boolean; favorite_nodes: string[] }> => {
  try {
    console.log(`Toggling favorite for node: ${nodeId}`);
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/${nodeId}/favorite`;
    console.log(`Making POST request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error toggling favorite:', response.status, errorText);
      throw new Error(`Failed to toggle favorite: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Toggle favorite response:', data);
    return data;
  } catch (error) {
    console.error('Error in toggleFavoriteNode:', error);
    throw error;
  }
};

/**
 * Bulk upload multiple custom nodes
 * @param token JWT authentication token
 * @param nodesData Array of node data objects
 * @returns Upload result with created and failed counts
 */
export const bulkUploadNodes = async (token: string, nodesData: Partial<CustomNodeData>[]): Promise<{ created: number; failed: number; errors?: string[] }> => {
  try {
    console.log(`Bulk uploading ${nodesData.length} nodes`);
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/bulk-upload`;
    console.log(`Making POST request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      },
      body: JSON.stringify(nodesData)
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error uploading nodes:', response.status, errorText);
      throw new Error(`Failed to upload nodes: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Bulk upload response:', data);
    return data;
  } catch (error) {
    console.error('Error in bulkUploadNodes:', error);
    throw error;
  }
};

/**
 * Fetch user's favorite node IDs
 * @param token JWT authentication token
 * @returns Array of favorite node IDs
 */
export const getFavoriteNodes = async (token: string): Promise<string[]> => {
  try {
    console.log('Fetching favorite nodes');
    
    if (!token) {
      console.error('No authentication token provided');
      throw new Error('Authentication token is required');
    }
    
    const fullUrl = `${API_URL}/workflow-manager/custom-nodes/favorites/list`;
    console.log(`Making GET request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json'
      }
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching favorites:', response.status, errorText);
      throw new Error(`Failed to fetch favorites: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Favorites response:', data);
    return data.favorite_nodes || [];
  } catch (error) {
    console.error('Error in getFavoriteNodes:', error);
    throw error;
  }
};
