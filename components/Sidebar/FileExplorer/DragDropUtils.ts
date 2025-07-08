import { FileNode } from './utils/FileExplorerClass';
import { FileExplorerConfig } from './config';

// Import auth store to get the authentication token
import { useAuthStore } from '../../../lib/stores/auth-store';
import { host, port } from '@/config/server';

// Helper function to get the API base URL
const getApiBaseUrl = () => {
  // If a custom API URL is specified in the config, use it
  if (FileExplorerConfig.API_BASE_URL) {
    console.log('Using custom API URL:', FileExplorerConfig.API_BASE_URL);
    return FileExplorerConfig.API_BASE_URL;
  }
  
  // Use localhost:8000 for backend API calls
  const apiBaseUrl = `http://${host}:${port}`;
  console.log('Using fixed API URL:', apiBaseUrl);
  return apiBaseUrl;
};

// Helper function to get the authentication token
const getAuthToken = (): string | null => {
  // Get the token from the auth store
  const token = useAuthStore.getState().token;
  logger.debug('Auth token:', token ? 'Token available' : 'No token available');
  return token;
};

// Helper function to get common headers for API requests
const getApiHeaders = (contentType?: string): HeadersInit => {
  const headers: HeadersInit = {};
  
  // Add content type if specified
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  // Add authorization header if token is available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Logger for file operations
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[FileExplorer] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[FileExplorer] ERROR: ${message}`, error || '');
  },
  debug: (message: string, data?: any) => {
    console.debug(`[FileExplorer] DEBUG: ${message}`, data || '');
  }
};

// Types for drag and drop operations
export interface DragDropState {
  isDragging: boolean;
  dragTarget: FileNode | null;
}

/**
 * Handles file upload via drag and drop or file input
 * @param files Files to upload
 * @param destinationPath Path where the files should be uploaded
 * @param onProgress Optional callback for upload progress
 * @param onComplete Optional callback when upload completes
 * @param onError Optional callback for upload errors
 */
export const uploadFiles = async (
  files: File[],
  destinationPath: string,
  onProgress?: (progress: number, bytesUploaded: number, fileIndex?: number, totalFiles?: number) => void,
  onComplete?: (result: any) => void,
  onError?: (error: any) => void
): Promise<void> => {
  try {
    logger.info(`Starting upload of ${files.length} files to ${destinationPath}`);
    logger.debug('Upload configuration:', {
      apiUrl: getApiBaseUrl(),
      autoOverwrite: FileExplorerConfig.AUTO_OVERWRITE,
      maxStandardFileSize: FileExplorerConfig.MAX_STANDARD_FILE_SIZE,
      chunkSize: FileExplorerConfig.CHUNK_SIZE
    });
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetPath = `${destinationPath}/${file.name}`;
      logger.info(`Uploading file ${i+1}/${files.length}: ${file.name} (${file.size} bytes) to ${targetPath}`);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_path', targetPath);
      formData.append('overwrite', FileExplorerConfig.AUTO_OVERWRITE.toString());
      
      // Upload the file with progress tracking using fetch instead of axios
      // Use the helper function to get the base URL
      const apiUrl = `${getApiBaseUrl()}/api/v1/large-files/upload`;
      logger.debug(`Making API request to: ${apiUrl}`);
      
      // Track uploaded bytes for this file
      let uploadedBytes = 0;
      const totalBytes = files.reduce((total, f) => total + f.size, 0);
      
      // Update file index for progress tracking
      if (onProgress) {
        onProgress(0, 0, i, files.length);
      }
      
      try {
        // Add authorization header to the request
        const headers = getApiHeaders();
        
        // Create a custom XMLHttpRequest to track upload progress
        const xhr = new XMLHttpRequest();
        const promise = new Promise<any>((resolve, reject) => {
          xhr.open('POST', apiUrl);
          
          // Add headers
          Object.entries(headers).forEach(([key, value]) => {
            if (value) xhr.setRequestHeader(key, value as string);
          });
          
          // Track upload progress
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
              // Calculate progress for this file
              const fileProgress = (event.loaded / event.total) * 100;
              uploadedBytes = event.loaded;
              
              // Calculate overall progress based on file index
              const overallProgress = ((i / files.length) * 100) + (fileProgress / files.length);
              onProgress(Math.min(overallProgress, 99), uploadedBytes, i, files.length);
              
              logger.debug(`Upload progress: ${fileProgress.toFixed(2)}% (${uploadedBytes} bytes) - File ${i+1}/${files.length}`);
            }
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const responseData = JSON.parse(xhr.responseText);
                resolve(responseData);
              } catch (e) {
                reject(new Error(`Invalid JSON response: ${xhr.responseText}`));
              }
            } else {
              reject(new Error(`HTTP error! status: ${xhr.status}, message: ${xhr.responseText}`));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error during upload'));
          };
          
          xhr.onabort = () => {
            reject(new Error('Upload aborted'));
          };
        });
        
        // Send the form data
        xhr.send(formData);
        
        // Wait for the upload to complete
        const responseData = await promise;
        logger.debug('Upload successful, server response:', responseData);
        
        if (onComplete) onComplete(responseData);
        
        // Report 100% progress when complete
        if (onProgress) onProgress(100, totalBytes);
      } catch (error) {
        logger.error('Network or server error during upload:', error);
        if (onError) onError(error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error uploading files:', error);
    if (onError) onError(error);
  }
};

/**
 * Handles folder upload via drag and drop
 * This is more complex as we need to maintain the folder structure
 */
export const uploadFolder = async (
  items: DataTransferItemList,
  destinationPath: string,
  onProgress?: (progress: number) => void,
  onComplete?: (result: any) => void,
  onError?: (error: any) => void
): Promise<void> => {
  try {
    // Process each item (could be files or folders)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Handle folder (webkitGetAsEntry is non-standard but widely supported)
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        
        if (entry && entry.isDirectory) {
          await processDirectory(entry as FileSystemDirectoryEntry, destinationPath, onProgress, onComplete, onError);
        } else if (entry && entry.isFile) {
          await processFile(entry as FileSystemFileEntry, destinationPath, onProgress, onComplete, onError);
        }
      }
    }
  } catch (error) {
    console.error('Error uploading folder:', error);
    if (onError) onError(error);
  }
};

/**
 * Process a directory entry recursively
 */
const processDirectory = async (
  directoryEntry: FileSystemDirectoryEntry,
  destinationPath: string,
  onProgress?: (progress: number) => void,
  onComplete?: (result: any) => void,
  onError?: (error: any) => void
): Promise<void> => {
  const targetPath = `${destinationPath}/${directoryEntry.name}`;
  
  logger.info(`Processing directory: ${directoryEntry.name}`);
  
  // Create the directory on the server
  try {
    await createDirectory(targetPath);
    
    // Read directory contents
    const dirReader = directoryEntry.createReader();
    
    // Process all entries in the directory
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        dirReader.readEntries((entries) => {
          if (entries.length === 0) {
            resolve([]);
          } else {
            resolve(entries);
          }
        }, reject);
      });
    };
    
    let entries: FileSystemEntry[] = [];
    let readBatch = await readEntries();
    
    // Continue reading until all entries are processed (readEntries has a limit)
    while (readBatch.length > 0) {
      entries = [...entries, ...readBatch];
      readBatch = await readEntries();
    }
    
    // Process all entries
    for (const entry of entries) {
      if (entry.isDirectory) {
        await processDirectory(entry as FileSystemDirectoryEntry, targetPath, onProgress, onComplete, onError);
      } else if (entry.isFile) {
        await processFile(entry as FileSystemFileEntry, targetPath, onProgress, onComplete, onError);
      }
    }
    
  } catch (error) {
    console.error(`Error processing directory ${directoryEntry.name}:`, error);
    if (onError) onError(error);
  }
};

/**
 * Creates a directory on the server
 * @param path Path of the directory to create
 */
export const createDirectory = async (path: string): Promise<void> => {
  if (!path) {
    logger.error('Invalid directory path');
    return;
  }
  
  logger.info(`Creating directory: ${path}`);
  
  // Create the directory on the server
  try {
    // Use the helper function to get the base URL
    const apiUrl = `${getApiBaseUrl()}/api/v1/file-explorer/create-directory`;
    logger.debug(`Making API request to create directory: ${apiUrl}`);
    
    // Get headers with authentication and content type
    const headers = getApiHeaders('application/json');
    
    // Get the root path from the file explorer store if available
    // If not available, use the parent directory of the path
    const rootPath = path.split('/').slice(0, -1).join('/') || '/';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        path: path,
        root_path: rootPath 
      })
    });
    
    logger.debug(`Directory creation response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to create directory ${path}:`, errorText);
      throw new Error(`Failed to create directory: ${response.status} ${response.statusText}`);
    }
    
    logger.info(`Directory created successfully: ${path}`);
  } catch (error) {
    logger.error(`Error creating directory ${path}:`, error);
    throw error;
  }
};

/**
 * Process a file entry
 */
const processFile = async (
  fileEntry: FileSystemFileEntry,
  destinationPath: string,
  onProgress?: (progress: number) => void,
  onComplete?: (result: any) => void,
  onError?: (error: any) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    fileEntry.file(async (file) => {
      try {
        const targetPath = `${destinationPath}/${file.name}`;
        logger.info(`Processing file: ${file.name} (${file.size} bytes) to ${targetPath}`);
        
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_path', targetPath);
        formData.append('overwrite', FileExplorerConfig.AUTO_OVERWRITE.toString());
        
        // Upload the file with progress tracking using fetch
        // Use the helper function to get the base URL
        const apiUrl = `${getApiBaseUrl()}/api/v1/large-files/upload`;
        logger.debug(`Making API request to upload file: ${apiUrl}`);
        
        // Add authorization header to the request
        const headers = getApiHeaders();
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: formData
        });
        
        logger.debug(`File upload response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`Upload failed for ${file.name}:`, errorText);
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        logger.debug(`File ${file.name} uploaded successfully:`, data);
        
        if (onComplete) onComplete(data);
        
        // Report 100% progress when complete
        if (onProgress) onProgress(100);
        resolve();
      } catch (error) {
        logger.error(`Error processing file ${file.name}:`, error);
        if (onError) onError(error);
        reject(error);
      }
    }, (error) => {
      logger.error('Error getting file from FileSystemFileEntry:', error);
      if (onError) onError(error);
      reject(error);
    });
  });
};

/**
 * Determines if the drag event contains files or folders
 */
export const hasDragItems = (event: React.DragEvent): boolean => {
  if (event.dataTransfer.types) {
    return event.dataTransfer.types.includes('Files');
  }
  return false;
};

/**
 * Gets the target node for a drag event
 */
export const getDragTargetNode = (
  event: React.DragEvent,
  fileTree: FileNode | null,
  getNodeFromPath: (path: string) => FileNode | null
): FileNode | null => {
  // Get the element that was the target of the drag
  const target = event.target as HTMLElement;
  
  // Find the closest node element
  const nodeElement = target.closest('[data-path]');
  
  if (nodeElement) {
    const path = nodeElement.getAttribute('data-path');
    if (path) {
      return getNodeFromPath(path);
    }
  }
  
  // If no specific node was targeted, return the root
  return fileTree;
};
