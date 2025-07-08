import { getServerConfig } from '@/config/server';
import { useAuthStore } from '@/lib/stores/auth-store';

// Base API URL
const API_BASE_URL = `${getServerConfig().api.protocol}://${getServerConfig().api.host}:${getServerConfig().api.port}/api/v1`;

/**
 * Service for file operations
 */
export const FileService = {
  /**
   * Get file content from the backend
   * @param filePath Path to the file
   * @param rootPath Root path for security validation
   * @returns File content and metadata
   */
  async getFileContent(filePath: string, tokenParam?: string | null, rootPath: string = '/home'): Promise<{
    content: string;
    metadata: any;
    binary: boolean;
    truncated: boolean;
  }> {
    // Get token from param or auth store
    const token = tokenParam || useAuthStore.getState().token;
    
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const url = new URL(`${API_BASE_URL}/file-explorer/file-content`);
    url.searchParams.append('path', filePath);
    url.searchParams.append('root_path', rootPath);

    try {
      console.log(`Fetching file content from: ${url.toString()}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching file: ${response.status}`);
      }

      const data = await response.json();
      console.log('File content response:', data);
      
      // Ensure content is properly decoded if it's not binary
      if (!data.binary && typeof data.content === 'string') {
        // Content is already a string, no need to decode
        return data;
      } else if (!data.binary && data.content) {
        // Try to decode content if it's not already a string
        try {
          // If content is base64 encoded, decode it
          const decodedContent = atob(data.content);
          return {
            ...data,
            content: decodedContent
          };
        } catch (e) {
          console.error('Error decoding content:', e);
          return data; // Return original data if decoding fails
        }
      } else {
        return data;
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  }
};

export default FileService;
