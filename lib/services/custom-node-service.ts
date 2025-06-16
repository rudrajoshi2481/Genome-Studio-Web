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
  user_id: number;
  created_at: string;
  updated_at: string | null;
}

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
export const updateCustomNode = async (token: string, nodeId: string | number, nodeData: any): Promise<CustomNode> => {
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
