/**
 * Configuration for the File Explorer component
 * This file contains settings that can be customized for different environments
 */

export const FileExplorerConfig = {
  /**
   * API base URL for file operations
   * Set this to a custom URL if accessing the API from outside the Docker container
   * Example: 'http://your-server-ip:8000' or 'http://localhost:8000'
   * Leave empty to use the current origin (window.location.origin)
   */
  API_BASE_URL: '',
  
  /**
   * Maximum file size for standard uploads (in bytes)
   * Files larger than this will be uploaded in chunks
   * Default: 50MB
   */
  MAX_STANDARD_FILE_SIZE: 50 * 1024 * 1024,
  
  /**
   * Chunk size for large file uploads (in bytes)
   * Default: 1MB
   */
  CHUNK_SIZE: 1 * 1024 * 1024,
  
  /**
   * Whether to automatically overwrite existing files
   * If false, the user will be prompted before overwriting
   */
  AUTO_OVERWRITE: true,
  
  /**
   * Timeout for API requests (in milliseconds)
   * Default: 30 seconds
   */
  REQUEST_TIMEOUT: 30000,
};
