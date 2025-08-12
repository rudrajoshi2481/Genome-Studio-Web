/**
 * Simplified API Service for File Explorer New
 * Production-ready implementation with dynamic URL resolution
 */

import { getApiBaseUrl } from '@/config/server';
import * as authService from '@/lib/services/auth-service';
import { 
  FileTreeResponse, 
  FileContentResponse, 
  FileNode, 
  SearchResult, 
  SearchFilters
} from '../types';

// Helper to build endpoint URLs
const buildUrl = (endpoint: string) => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/file-explorer-new${endpoint}`;
};

// Get authorization headers
const getAuthHeaders = (): Record<string, string> => {
  const token = authService.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Get authorization headers for file uploads (no Content-Type)
const getAuthHeadersForUpload = (): Record<string, string> => {
  const token = authService.getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Make authenticated request
const makeRequest = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * File Explorer API Service
 */
export class FileExplorerApiService {
  // Helper to get current root path dynamically
  private getCurrentRootPath(): string {
    try {
      const stored = localStorage.getItem('fileExplorer_rootPath');
      return stored || '/home'; // Default fallback to match store default
    } catch {
      return '/home'; // Fallback if localStorage fails
    }
  }
  // Get file tree
  async getFileTree(rootPath: string, forceRefresh: boolean = false): Promise<FileTreeResponse> {
    const params = new URLSearchParams({
      directory: rootPath,
      max_depth: '3',
      force_refresh: forceRefresh.toString()
    });
    return makeRequest(`${buildUrl('/tree')}?${params}`);
  }

  // Get file content
  async getFileContent(path: string): Promise<FileContentResponse> {
    const params = new URLSearchParams({
      path: path,
      root_path: this.getCurrentRootPath()
    });
    return makeRequest(`${buildUrl('/file-content')}?${params}`);
  }

  // Create file
  async createFile(path: string, content: string = ''): Promise<void> {
    await makeRequest(buildUrl('/create-file'), {
      method: 'POST',
      body: JSON.stringify({
        path,
        root_path: this.getCurrentRootPath(),
        content
      })
    });
  }

  // Create directory
  async createDirectory(path: string): Promise<void> {
    await makeRequest(buildUrl('/create-directory'), {
      method: 'POST',
      body: JSON.stringify({
        path,
        root_path: this.getCurrentRootPath()
      })
    });
  }

  // Update file content
  async updateFile(path: string, content: string): Promise<void> {
    await makeRequest(buildUrl('/update'), {
      method: 'POST',
      body: JSON.stringify({
        path,
        content
      })
    });
  }

  // Delete item
  async deleteItem(path: string, isDir: boolean): Promise<void> {
    const params = new URLSearchParams({
      path: path,
      root_path: this.getCurrentRootPath(),
      force: 'false'
    });
    await makeRequest(`${buildUrl('/delete-file')}?${params}`, {
      method: 'DELETE'
    });
  }

  // Rename item
  async renameItem(oldPath: string, newPath: string): Promise<void> {
    await makeRequest(buildUrl('/rename-file'), {
      method: 'POST',
      body: JSON.stringify({
        old_path: oldPath,
        new_path: newPath,
        root_path: this.getCurrentRootPath()
      })
    });
  }

  // Duplicate/Copy item
  async duplicateItem(sourcePath: string, destinationPath: string): Promise<void> {
    await makeRequest(buildUrl('/bulk-operation'), {
      method: 'POST',
      body: JSON.stringify({
        operation: 'copy',
        paths: [sourcePath],
        destination: destinationPath,
        root_path: this.getCurrentRootPath()
      })
    });
  }

  // Search files
  async searchFiles(query: string, rootPath: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      directory: rootPath,
      query: query,
      max_results: '100'
    });
    const response = await makeRequest(`${buildUrl('/search')}?${params}`);
    return response.results || [];
  }

  // Upload file
  async uploadFile(file: File, targetPath: string): Promise<void> {
    const filePath = `${targetPath}/${file.name}`;
    const params = new URLSearchParams({
      file_path: filePath,
      root_path: this.getCurrentRootPath(),
      overwrite: 'false'
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${buildUrl('/upload')}?${params}`, {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
  }

  // Download file
  async downloadFile(path: string): Promise<Blob> {
    const rootPath = this.getCurrentRootPath();
    const response = await fetch(`${buildUrl('/download')}?path=${encodeURIComponent(path)}&root_path=${encodeURIComponent(rootPath)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Download failed: ${errorText}`);
    }

    return response.blob();
  }

  async moveItems(paths: string[], destination: string): Promise<void> {
    const rootPath = this.getCurrentRootPath();
    const response = await fetch(`${buildUrl('/bulk-operation')}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        operation: 'move',
        paths,
        destination,
        root_path: rootPath
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Move failed: ${errorText}`);
    }
  }

  // Check if file exists
  async fileExists(path: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({ path });
      const response = await makeRequest(`${buildUrl('/exists')}?${params}`);
      return response.exists;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const fileExplorerApi = new FileExplorerApiService();
